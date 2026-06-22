// Store File Deployer - Browser Frontend Handler
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const checkSelector = document.getElementById('checkSelector');
    const additionalCheckSelector = document.getElementById('additionalCheckSelector');
    const additionalCheckSelector2 = document.getElementById('additionalCheckSelector2');
    const storesInput = document.getElementById('storesInput');
    const generateScriptBtn = document.getElementById('generateScriptBtn');
    const inputValidationMsg = document.getElementById('inputValidationMsg');
    const statusCard = document.getElementById('statusCard');
    const overallStatus = document.getElementById('overallStatus');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressCount = document.getElementById('progressCount');
    const consoleOutput = document.getElementById('consoleOutput');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const copyLogsBtn = document.getElementById('copyLogsBtn');
    
    // Modal Elements
    const helpModal = document.getElementById('helpModal');
    const openHelpBtn = document.getElementById('openHelpBtn');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    
    // User Badge Info
    const usernameSpan = document.getElementById('username');

    // Toast Elements
    const successToast = document.getElementById('successToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastCloseBtn = document.getElementById('toastCloseBtn');
    let toastTimeout;
    
    // State Tracking
    let pollingIntervalId = null;
    let renderedLogsCount = 0;

    // Theme Toggle Handler
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.textContent = 'light_mode';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeIcon) themeIcon.textContent = 'dark_mode';
    }
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (themeIcon) themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
            addLog(`Tema alterado para modo ${isDark ? 'escuro' : 'claro'}.`, 'system');
        });
    }

    // Modal Events
    openHelpBtn.addEventListener('click', () => helpModal.classList.add('active'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('active'));
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.classList.remove('active');
    });

    // Console Action Events
    clearLogsBtn.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
        renderedLogsCount = 0;
        addLog('Console limpo.', 'system');
    });

    copyLogsBtn.addEventListener('click', () => {
        const text = consoleOutput.innerText;
        navigator.clipboard.writeText(text)
            .then(() => {
                addLog('Logs copiados para a área de transferência!', 'success');
            })
            .catch(err => {
                addLog('Falha ao copiar logs: ' + err, 'error');
            });
    });

    // Toast Notification Helper
    function showToast(title, body) {
        if (!successToast) return;
        toastTitle.textContent = title;
        toastBody.textContent = body;
        clearTimeout(toastTimeout);
        successToast.classList.add('show');
        toastTimeout = setTimeout(() => {
            successToast.classList.remove('show');
        }, 6000);
    }

    if (toastCloseBtn) {
        toastCloseBtn.addEventListener('click', () => {
            if (successToast) successToast.classList.remove('show');
            clearTimeout(toastTimeout);
        });
    }

    // Input Validation Logic
    function validateForm() {
        const checkSelected = checkSelector.value !== "";
        const storesValue = storesInput.value.trim();
        
        let isValid = true;
        
        // 1. Check selector validation
        if (!checkSelected) {
            inputValidationMsg.textContent = 'Por favor, selecione um Tipo de Check.';
            inputValidationMsg.style.display = 'block';
            checkSelector.style.borderColor = 'var(--color-danger)';
            addLog('⚠️ Erro: Selecione um tipo de check.', 'warning');
            isValid = false;
        } else {
            checkSelector.style.borderColor = '';
        }
        
        // 2. Stores input validation
        if (storesValue === "") {
            inputValidationMsg.textContent = 'Por favor, insira as lojas (ex: 10,20,30-35).';
            inputValidationMsg.style.display = 'block';
            storesInput.style.borderColor = 'var(--color-danger)';
            addLog('⚠️ Erro: A lista de lojas não pode estar vazia.', 'warning');
            isValid = false;
        } else {
            const rangeRegex = /^(\s*\d+\s*(-\s*\d+\s*)?)(,\s*\d+\s*(-\s*\d+\s*)?)*$/;
            
            if (rangeRegex.test(storesValue)) {
                if (isValid) inputValidationMsg.style.display = 'none';
                storesInput.style.borderColor = '';
            } else {
                inputValidationMsg.textContent = 'Formato inválido. Use números, vírgula e hífen (ex: 10,20,30-35).';
                inputValidationMsg.style.display = 'block';
                storesInput.style.borderColor = 'var(--color-danger)';
                addLog('⚠️ Erro: O formato das lojas é inválido. Consulte o botão "Exemplos de formato".', 'warning');
                isValid = false;
            }
        }

        return isValid;
    }

    // Input listeners to clear validation styles
    checkSelector.addEventListener('change', () => {
        if (checkSelector.value !== "") {
            checkSelector.style.borderColor = '';
            inputValidationMsg.style.display = 'none';
        }
    });
    storesInput.addEventListener('input', () => {
        if (storesInput.value.trim() !== "") {
            storesInput.style.borderColor = '';
            inputValidationMsg.style.display = 'none';
        }
    });

    // Action Execution Trigger
    function executeAction(endpoint, actionNameLabel) {
        if (!validateForm()) return;
        
        const check = checkSelector.value;
        const additionalCheck = additionalCheckSelector.value;
        const additionalCheck2 = additionalCheckSelector2.value;
        const stores = storesInput.value;
        
        // Reset logs UI and lock inputs
        consoleOutput.innerHTML = '';
        renderedLogsCount = 0;
        disableControls(true);
        showStatusCard(true);
        setStatus('Inicializando...', 'info');
        updateProgress(0, 0, 'Iniciando...');
        
        addLog(`Iniciando ação: ${actionNameLabel}...`, 'system');

        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(JSON.stringify({ 
                action: 'generateScript', 
                check: check, 
                additionalCheck: additionalCheck,
                additionalCheck2: additionalCheck2,
                stores: stores
            }));
            return;
        }

        // Post request to backend
        fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ check, additionalCheck, additionalCheck2, stores })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Start polling status
                startPolling();
            } else {
                disableControls(false);
                setStatus('Falha de Input', 'danger');
                addLog(`❌ Erro de Input: ${data.error || 'Erro desconhecido.'}`, 'error');
                showToast('Falha no Processamento', data.error || 'Verifique as lojas fornecidas.');
            }
        })
        .catch(err => {
            disableControls(false);
            setStatus('Erro de Rede', 'danger');
            addLog(`❌ Falha de Rede: ${err.message}`, 'error');
        });
    }

    generateScriptBtn.addEventListener('click', () => {
        executeAction('generate', 'Gerar Script');
    });

    // Logging Helper
    function addLog(message, level = 'info') {
        const line = document.createElement('div');
        line.className = `log-line ${level}`;
        line.textContent = message;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Polling Status Logic
    function startPolling() {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        
        pollingIntervalId = setInterval(() => {
            fetch('/api/status')
            .then(res => res.json())
            .then(state => {
                // Incremental logs rendering
                renderIncrementalLogs(state.logs);
                
                // Progress Updates
                updateProgress(state.progressCount, state.progressTotal, state.progressMsg);
                
                // Status indicator
                if (state.isRunning) {
                    setStatus(state.progressMsg || 'Processando...', 'info');
                } else {
                    // Finished!
                    clearInterval(pollingIntervalId);
                    pollingIntervalId = null;
                    disableControls(false);
                    
                    let resultText = "";
                    if (state.result) {
                        resultText = Array.isArray(state.result) ? state.result.join(" ") : String(state.result);
                    }
                    
                    const isSuccess = resultText && !resultText.toLowerCase().includes('erro') && !resultText.toLowerCase().includes('falha');
                    
                    if (isSuccess) {
                        setStatus('Concluído', 'success');
                        addLog(`✅ Processo finalizado: ${resultText}`, 'success');
                        showToast('Script Gerado!', 'script gerado e pronto para ser executado no Endpoint Manager');
                    } else {
                        setStatus('Falha', 'danger');
                        addLog(`❌ Processo finalizado com erros: ${resultText}`, 'error');
                        showToast('Operação com Erro', resultText);
                    }
                }
            })
            .catch(err => {
                console.error('Erro de polling:', err);
            });
        }, 300);
    }

    function renderIncrementalLogs(logs) {
        if (!logs) return;
        while (renderedLogsCount < logs.length) {
            const logLine = logs[renderedLogsCount];
            let level = 'info';
            
            // Deduce styling from console markers
            if (logLine.includes('✅')) level = 'success';
            else if (logLine.includes('❌') || logLine.includes('[ERRO]')) level = 'error';
            else if (logLine.includes('⚠️') || logLine.includes('[AVISO]')) level = 'warning';
            else if (logLine.includes('▶️')) level = 'cmd';
            else if (logLine.startsWith('[') && logLine.includes('   ')) level = 'sublog';
            else if (logLine.includes('ℹ️') || logLine.includes('---')) level = 'system';
            
            addLog(logLine, level);
            renderedLogsCount++;
        }
    }

    function updateProgress(current, total, message) {
        if (total === 0) {
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
            progressCount.textContent = '0/0 lojas';
            return;
        }
        
        const pct = Math.round((current / total) * 100);
        progressBar.style.width = `${pct}%`;
        progressPercent.textContent = `${pct}%`;
        progressCount.textContent = `${current}/${total} lojas`;
    }

    function setStatus(statusText, type = 'info') {
        overallStatus.textContent = statusText;
        overallStatus.style.background = '';
        overallStatus.style.color = '';
        
        if (type === 'success') {
            overallStatus.style.background = 'rgba(16, 185, 129, 0.15)';
            overallStatus.style.color = 'var(--color-success)';
        } else if (type === 'danger') {
            overallStatus.style.background = 'rgba(239, 68, 68, 0.15)';
            overallStatus.style.color = 'var(--color-danger)';
        } else if (type === 'warning') {
            overallStatus.style.background = 'rgba(245, 158, 11, 0.15)';
            overallStatus.style.color = 'var(--color-warning)';
        } else {
            overallStatus.style.background = 'rgba(59, 130, 246, 0.15)';
            overallStatus.style.color = 'var(--color-primary)';
        }
    }

    function showStatusCard(visible) {
        if (visible) {
            statusCard.classList.remove('collapsed');
        } else {
            statusCard.classList.add('collapsed');
        }
    }

    function disableControls(disabled) {
        checkSelector.disabled = disabled;
        additionalCheckSelector.disabled = disabled;
        additionalCheckSelector2.disabled = disabled;
        storesInput.disabled = disabled;
        generateScriptBtn.disabled = disabled;
    }

    const isWebView2 = window.chrome && window.chrome.webview;

    if (isWebView2) {
        // Setup listener first
        window.chrome.webview.addEventListener('message', event => {
            const state = JSON.parse(event.data);
            
            if (state.type === 'info') {
                usernameSpan.textContent = state.username || 'Usuário';
                addLog(`Conectado via WebView2 local. Usuário: ${state.username}`, 'system');
                addLog(`Status Banco Lojas: ${state.csvStatus}`, 'system');
            }
            else if (state.type === 'log') {
                addLog(state.message, state.level);
            }
            else if (state.type === 'progress') {
                updateProgress(state.current, state.total, state.message);
                if (state.message) {
                    setStatus(state.message, 'info');
                }
            }
            else if (state.type === 'finished') {
                disableControls(false);
                const resultText = state.result;
                const isSuccess = resultText && !resultText.toLowerCase().includes('erro') && !resultText.toLowerCase().includes('falha');
                
                if (isSuccess) {
                    setStatus('Concluído', 'success');
                    addLog(`✅ Processo finalizado: ${resultText}`, 'success');
                    showToast('Script Gerado!', 'script gerado e pronto para ser executado no Endpoint Manager');
                } else {
                    setStatus('Falha', 'danger');
                    addLog(`❌ Processo finalizado com erros: ${resultText}`, 'error');
                    showToast('Operação com Erro', resultText);
                }
            }
        });

        // Request initial info
        window.chrome.webview.postMessage(JSON.stringify({ action: 'getInfo' }));
    } else {
        // Fetch initial workspace/user badge details from backend on load
        fetch('/api/info')
        .then(res => res.json())
        .then(info => {
            usernameSpan.textContent = info.username || 'Usuario';
            addLog(`Conectado ao servidor PowerShell local. Usuário: ${info.username}`, 'system');
            addLog(`Status Banco Lojas: ${info.csvStatus}`, 'system');
        })
        .catch(err => {
            usernameSpan.textContent = 'Erro';
            addLog(`❌ Não foi possível obter dados do servidor backend: ${err.message}`, 'error');
        });
    }

    // --- Google Antigravity Particle Animation ---
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        
        let mouse = {
            x: null,
            y: null
        };
        
        function resizeCanvas() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        
        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });
        
        class CapsuleParticle {
            constructor() {
                this.baseX = Math.random() * window.innerWidth;
                this.baseY = Math.random() * window.innerHeight;
                
                // Random length between 10 and 24
                this.length = Math.random() * 14 + 10;
                this.thickness = this.length * (Math.random() * 0.08 + 0.32); // aspect ratio ~2.5 to 3
                
                // Parallax layers (depth): smaller/thinner are deeper, move slower, and have less opacity
                this.parallax = (this.length - 10) / 14; // 0 to 1
                
                // Slow upward drift
                this.speedY = -(Math.random() * 0.25 + 0.08) * (0.4 + this.parallax * 0.6);
                this.speedX = (Math.random() - 0.5) * 0.08 * (0.4 + this.parallax * 0.6);
                
                this.seedX = Math.random() * 200;
                this.seedY = Math.random() * 200;
                
                this.baseAngle = Math.random() * Math.PI * 2;
                this.angle = this.baseAngle;
                this.spinSpeed = (Math.random() - 0.5) * 0.012;
                
                this.dispX = 0;
                this.dispY = 0;
                
                this.colorIndex = Math.floor(Math.random() * 3);
            }
            
            update(time) {
                // Drift base position upward
                this.baseY += this.speedY;
                this.baseX += this.speedX;
                
                const pad = 40;
                const width = window.innerWidth;
                const height = window.innerHeight;
                
                // Wrap around edges
                if (this.baseY < -pad) {
                    this.baseY = height + pad;
                    this.baseX = Math.random() * width;
                } else if (this.baseY > height + pad) {
                    this.baseY = -pad;
                    this.baseX = Math.random() * width;
                }
                
                if (this.baseX < -pad) {
                    this.baseX = width + pad;
                } else if (this.baseX > width + pad) {
                    this.baseX = -pad;
                }
                
                // Organic wavy drift
                const waveX = Math.sin(time * 0.35 + this.seedX) * 12 * (0.5 + this.parallax * 0.5);
                const waveY = Math.cos(time * 0.3 + this.seedY) * 10 * (0.5 + this.parallax * 0.5);
                
                const currentX = this.baseX + waveX;
                const currentY = this.baseY + waveY;
                
                // Mouse interaction
                let targetAngle = this.baseAngle + time * this.spinSpeed;
                
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = currentX - mouse.x;
                    const dy = currentY - mouse.y;
                    const distSq = dx * dx + dy * dy;
                    const activeRadius = 180; // repulsion active zone
                    const activeRadiusSq = activeRadius * activeRadius;
                    
                    if (distSq < activeRadiusSq) {
                        const dist = Math.sqrt(distSq);
                        // Aligns capsule to point away from cursor
                        targetAngle = Math.atan2(dy, dx);
                        
                        // Push force
                        const force = (activeRadius - dist) / activeRadius;
                        const pushForce = Math.pow(force, 1.6);
                        const maxPush = 48 * (0.4 + this.parallax * 0.6);
                        
                        const targetDispX = Math.cos(targetAngle) * pushForce * maxPush;
                        const targetDispY = Math.sin(targetAngle) * pushForce * maxPush;
                        
                        this.dispX += (targetDispX - this.dispX) * 0.08;
                        this.dispY += (targetDispY - this.dispY) * 0.08;
                    } else {
                        // Decay back to normal positioning
                        this.dispX += (0 - this.dispX) * 0.05;
                        this.dispY += (0 - this.dispY) * 0.05;
                    }
                } else {
                    // Decay
                    this.dispX += (0 - this.dispX) * 0.05;
                    this.dispY += (0 - this.dispY) * 0.05;
                }
                
                // Interpolate angle smoothly (shortest path)
                let angleDiff = targetAngle - this.angle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this.angle += angleDiff * 0.07;
                
                this.drawX = currentX + this.dispX;
                this.drawY = currentY + this.dispY;
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.drawX, this.drawY);
                ctx.rotate(this.angle);
                
                // Draw rounded capsule
                ctx.beginPath();
                const w = this.length;
                const h = this.thickness;
                ctx.moveTo(-w / 2 + h / 2, 0);
                ctx.lineTo(w / 2 - h / 2, 0);
                ctx.lineWidth = h;
                ctx.lineCap = 'round';
                
                // Dynamically resolve color based on current theme
                const isDark = document.body.classList.contains('dark-mode');
                let color;
                if (isDark) {
                    const darkPalette = [
                        { r: 113, g: 137, b: 255 }, // Lighter blue/indigo (#7189ff)
                        { r: 48, g: 116, b: 249 },  // Bright blue (#3074f9)
                        { r: 139, g: 92, b: 246 }   // Purple (#8b5cf6)
                    ];
                    const colorData = darkPalette[this.colorIndex];
                    const alpha = (0.22 + this.parallax * 0.35).toFixed(2); // slightly brighter in dark mode
                    color = `rgba(${colorData.r}, ${colorData.g}, ${colorData.b}, ${alpha})`;
                } else {
                    const lightPalette = [
                        { r: 44, g: 100, b: 237 }, // #2c64ed (Blue)
                        { r: 248, g: 66, b: 66 },  // #f84242 (Red)
                        { r: 255, g: 207, b: 3 }   // #ffcf03 (Yellow)
                    ];
                    const colorData = lightPalette[this.colorIndex];
                    const alpha = (0.16 + this.parallax * 0.22).toFixed(2);
                    color = `rgba(${colorData.r}, ${colorData.g}, ${colorData.b}, ${alpha})`;
                }
                
                ctx.strokeStyle = color;
                ctx.stroke();
                
                ctx.restore();
            }
        }
        
        // Initialize particle field (optimized to 95 particles for 60fps performance)
        const particleCount = 95;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new CapsuleParticle());
        }
        
        function animate() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            const time = Date.now() * 0.001;
            
            particles.forEach(p => {
                p.update(time);
                p.draw();
            });
            requestAnimationFrame(animate);
        }
        
        animate();
    }
});
