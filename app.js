// 1. Initialize the Startup/Intro Animation
const introAnimation = lottie.loadAnimation({
    container: document.getElementById('intro-lottie'), 
    renderer: 'svg',
    loop: false,     
    autoplay: true,  
    path: 'opening.json',
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice' 
    }
});

introAnimation.setSpeed(0.75);

setTimeout(() => {
    document.getElementById('preset-grid').classList.add('visible');
}, 5300);

function syncGridScale() {
    if (!introAnimation.animationData) return;
    const aeWidth = introAnimation.animationData.w; 
    const aeHeight = introAnimation.animationData.h; 
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleFactor = Math.max(screenWidth / aeWidth, screenHeight / aeHeight);
    document.getElementById('preset-grid').style.transform = `translate(-50%, -50%) scale(${scaleFactor})`;
}

introAnimation.addEventListener('data_ready', syncGridScale);
window.addEventListener('resize', syncGridScale);

// 2. Initialize the Fluid Background
const liquidAnim = lottie.loadAnimation({
    container: document.getElementById('liquid-bg'),
    renderer: 'svg',
    loop: false,
    autoplay: false, 
    path: 'data.json',
    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
});

// 3. Initialize the Interactive Buttons
const btnAnim = lottie.loadAnimation({
    container: document.getElementById('btn-lottie'),
    renderer: 'svg',
    loop: false,
    autoplay: false, 
    path: 'buttons2.json',
    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
});

// VARIABLES
let time1 = 0; 
let time2 = 0;
let increment1 = 0; 
let increment2 = 0;
let delay1 = 0;     
let delay2 = 0;
let currentDelay = 0; 
let activePlayer = 0; 
let timerInterval;
let wakeLock = null; 
let isPaused = false;
let isGameOver = false; // 🟢 THE MAGIC SWITCH
let isSystemInitialized = false; 

const p1Display = document.getElementById('player1');
const p2Display = document.getElementById('player2');
const menuOverlay = document.getElementById('menu-overlay');
const presetBtns = document.querySelectorAll('.preset-btn:not(#customBtn)');
const customBtn = document.getElementById('customBtn');
const centerControls = document.getElementById('center-controls');
const pauseBtn = document.getElementById('pauseBtn');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');

let audioCtx;

function initAndStart() {
    if (!isSystemInitialized) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        enableWakeLockAndFullscreen(); 

        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        isSystemInitialized = true;
                        startGame();
                    } else {
                        alert("Sensor permission is required.");
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
            isSystemInitialized = true;
            startGame();
        }
    } else {
        startGame();
    }
}

// --- PRESET BUTTONS ---
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-time'));
        time1 = mins * 60;
        time2 = mins * 60;
        increment1 = parseInt(btn.getAttribute('data-inc'));
        increment2 = increment1; 
        delay1 = 0;            
        delay2 = 0;
        currentDelay = delay1; 
        updateDisplay();
        initAndStart();
    });
});

// --- CUSTOM MODAL LOGIC ---
const customModal = document.getElementById('custom-modal');
const customBackBtn = document.getElementById('custom-back-btn');
const customStartBtn = document.getElementById('custom-start-btn');
const asymToggle = document.getElementById('asym-toggle');
const p1Inputs = document.querySelectorAll('.p1-input');
const p2Inputs = document.querySelectorAll('.p2-input');

customBtn.addEventListener('click', () => {
    document.getElementById('preset-grid').style.display = 'none'; 
    customModal.style.display = 'flex'; 
});

customBackBtn.addEventListener('click', () => {
    customModal.style.display = 'none'; 
    document.getElementById('preset-grid').style.display = 'grid'; 
});

asymToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        p1Inputs.forEach((input, index) => {
            input.classList.add('inverted');
            p2Inputs[index].style.display = 'block';
            p2Inputs[index].value = input.value; 
        });
    } else {
        p1Inputs.forEach((input, index) => {
            input.classList.remove('inverted');
            p2Inputs[index].style.display = 'none';
        });
    }
});

customStartBtn.addEventListener('click', () => {
    let t1 = parseInt(document.getElementById('custom-time-1').value) || 5;
    let i1 = parseInt(document.getElementById('custom-inc-1').value) || 0;
    let d1 = parseInt(document.getElementById('custom-delay-1').value) || 0;
    let t2 = t1, i2 = i1, d2 = d1; 

    if (asymToggle.checked) {
        t2 = parseInt(document.getElementById('custom-time-2').value) || 5;
        i2 = parseInt(document.getElementById('custom-inc-2').value) || 0;
        d2 = parseInt(document.getElementById('custom-delay-2').value) || 0;
    }

    time1 = t1 * 60;
    time2 = t2 * 60;
    increment1 = i1;
    increment2 = i2;
    delay1 = d1;
    delay2 = d2;
    currentDelay = delay1; 
    
    updateDisplay();
    customModal.style.display = 'none';
    document.getElementById('preset-grid').style.display = 'grid'; 
    initAndStart();
});

// --- PLAY / PAUSE / STOP ---
pauseBtn.addEventListener('click', () => {
    if (!isPaused) {
        isPaused = true;
        clearInterval(timerInterval);
        btnAnim.playSegments([0, 24], true);
        pauseBtn.style.display = 'none';
        playBtn.style.display = 'block';
        stopBtn.style.display = 'block';
    }
});

playBtn.addEventListener('click', () => {
    isPaused = false;
    btnAnim.goToAndStop(0, true);
    playBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    setTimeout(() => { timerInterval = setInterval(tick, 1000); }, 300);
});

stopBtn.addEventListener('click', () => {
    isPaused = false;
    clearInterval(timerInterval);
    btnAnim.goToAndStop(0, true);
    playBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    centerControls.style.display = 'none';
    menuOverlay.style.display = 'flex';
    activePlayer = 0;
});

function playThump() {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);

    if (navigator.vibrate) navigator.vibrate(50);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateDisplay() {
    p1Display.textContent = formatTime(time1);
    p2Display.textContent = formatTime(time2);

    if (time1 === 0 && activePlayer !== 0) {
        p1Display.classList.add('timeout');
    } else {
        p1Display.classList.remove('timeout');
    }

    if (time2 === 0 && activePlayer !== 0) {
        p2Display.classList.add('timeout');
    } else {
        p2Display.classList.remove('timeout');
    }

    if (activePlayer === 1) {
        p1Display.classList.add('active');
        p2Display.classList.remove('active');
    } else if (activePlayer === 2) {
        p2Display.classList.add('active');
        p1Display.classList.remove('active');
    }
}

// --- UPDATED ENGINE LOGIC ---
function tick() {
    if (currentDelay > 0) {
        currentDelay--;
        return; 
    }
    
    if (activePlayer === 1 && time1 > 0) time1--;
    else if (activePlayer === 2 && time2 > 0) time2--;
    
    updateDisplay();

    if (time1 === 0 || time2 === 0) {
        isGameOver = true; 
        clearInterval(timerInterval);
    }
}

function switchPlayer(newPlayer) {
    if (isGameOver) return;

    if (activePlayer !== newPlayer) {
        if (activePlayer === 1) time1 += increment1;
        else if (activePlayer === 2) time2 += increment2;

        activePlayer = newPlayer;
        if (activePlayer === 1) currentDelay = delay1;
        else if (activePlayer === 2) currentDelay = delay2;
        
        playThump(); 
        updateDisplay();

        const liquidContainer = document.getElementById('liquid-bg');
        liquidAnim.setDirection(1);

        if (activePlayer === 1) {
            liquidContainer.classList.remove('flipped');
            liquidContainer.classList.add('flipped');
            liquidAnim.goToAndPlay(0, true); 
        } else if (activePlayer === 2) {
            liquidContainer.classList.add('flipped');
            liquidContainer.classList.remove('flipped');
            liquidAnim.goToAndPlay(0, true); 
        }
    }
}

function handleOrientation(event) {
    if (isPaused) return; 
    if (isGameOver) return;

    const tilt = event.beta; 
    
    if (tilt > 5) {
        switchPlayer(2); 
    } else if (tilt < -5) {
        switchPlayer(1); 
    }
}

async function enableWakeLockAndFullscreen() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen().catch(e => console.log(e)); 
    }
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {}
}

function startGame() {
    menuOverlay.style.display = 'none';
    centerControls.style.display = 'flex';
    activePlayer = 1; 
    currentDelay = delay1; 
    isGameOver = false; 
    updateDisplay();
    timerInterval = setInterval(tick, 1000);
}