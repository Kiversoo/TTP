document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('krugcontainer');
    const addBtn = document.getElementById('add-krug-btn');
    const workspace = document.getElementById('workspace');
    const ciklContainer = document.getElementById('cikl-container');
    const holst = document.getElementById('holst');
    const ctx = holst.getContext('2d');
    const modal = document.getElementById('add-doska');
    const titleInput = document.getElementById('note-title');
    const colorInput = document.getElementById('note-color');
    const confirmBtn = document.getElementById('confirm-doska');
    
    let workspaceData = {}; 
    let currentId = null;
    let scale = 1;
    let isDrawing = false;

    // --- МОДАЛЬНОЕ ОКНО ---
    addBtn.onclick = (e) => {
        const content = modal.querySelector('.doska-content');
        
        // 1. Координаты центра кнопки плюсика
        const rect = addBtn.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        // 2. Координаты центра экрана
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // 3. Считаем сдвиг от центра до кнопки
        const shiftX = startX - centerX;
        const shiftY = startY - centerY;

        modal.style.display = 'flex';

        // Мгновенно ставим окно на кнопку (невидимым)
        content.style.transition = 'none';
        content.style.transform = `translate(calc(-50% + ${shiftX}px), calc(-50% + ${shiftY}px)) scale(0)`;
        content.style.opacity = "0";

        // Форсируем перерисовку
        content.offsetHeight;

        // 4. Запуск анимации: летим в центр и увеличиваемся
        setTimeout(() => {
            modal.classList.add('active');
            content.style.transition = 'transform 0.7s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.6s ease';
            content.style.transform = "translate(-50%, -50%) scale(1)";
            content.style.opacity = "1";
        }, 10);

        titleInput.value = "";
        setTimeout(() => titleInput.focus(), 400);
    };

    const closeModal = () => {
        const content = modal.querySelector('.doska-content');
        modal.classList.remove('active');
        content.style.transform = "scale(0)";
        content.style.opacity = "0";
        
        setTimeout(() => {
            modal.style.display = 'opacity 0.3s ease';
        }, 20);
    };

    document.getElementById('cancel-doska').onclick = closeModal;

    // --- СОЗДАНИЕ И ОТПРАВКА ---
    confirmBtn.onclick = async () => {
        const title = titleInput.value.trim();
        const color = colorInput.value; 
        
        const response = await fetch('/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json' },
            body: JSON.stringify({ title, color, pageName: window.location.pathname })
        });

        if (response.ok) {
            const result = await response.json();
            renderCircle(result.id, title, color); // ТЕПЕРЬ ФУНКЦИЯ ЕСТЬ НИЖЕ
            closeModal();
        }
    };

    // --- ФУНКЦИЯ ОТРИСОВКИ (ВОЗВРАЩЕНА) ---
    function renderCircle(id, title = "", color = "#ffffff") {
        if (!container) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'circle-wrapper';
        wrapper.setAttribute('data-id', id); 
        
        wrapper.innerHTML = `
            <div class="circle.label">${title}</div>
            <div class="circle-icon" style="background-color: ${color};"></div>
            <button class="delete-btn">x</button>
        `;

        wrapper.onclick = (event) => {
            if (event.target.classList.contains('delete-btn')) return;
            document.querySelectorAll('.circle-wrapper').forEach(w => w.classList.remove('active'));
            wrapper.classList.add('active');
            openWorkspace(id);
        };

        const deleteBtn = wrapper.querySelector('.delete-btn');
        deleteBtn.onclick = async (event) => {
            event.stopPropagation();
            const response = await fetch(`/delete-note/${id}`, { method: 'DELETE' });
            if (response.ok) {
                if (currentId === id) {
                    currentId = null; 
                    ciklContainer.style.display = 'none'; 
                    ctx.clearRect(0, 0, holst.width, holst.height); 
                }
                wrapper.remove();
            }
        };

        container.appendChild(wrapper);
    }

    // --- ХОЛСТ И ЗУМ ---
    function openWorkspace(id) {
        if (!ciklContainer || !holst) return;
        ciklContainer.style.display = 'block';
        
        if (currentId !== null) {
            workspaceData[currentId] = {
                ...workspaceData[currentId],
                x: ciklContainer.offsetLeft,
                y: ciklContainer.offsetTop,
                zoom: scale,
                image: holst.toDataURL()
            };
        }

        currentId = id;
        const data = workspaceData[id] || {x: 0, y: 0, zoom: 1, image: null};
        scale = data.zoom;
        ciklContainer.style.transform = `scale(${scale})`;
        ciklContainer.style.left = data.x + 'px';
        ciklContainer.style.top = data.y + 'px';

        ctx.clearRect(0, 0, holst.width, holst.height);
        if(data.image) {
            const img = new Image();
            img.src = data.image;
            img.onload = () => ctx.drawImage(img, 0, 0);
        }
    }

    async function loadFromDb() {
        try {
            const response = await fetch('/notes');
            const notes = await response.json();
            container.innerHTML = '';
            notes.forEach(note => {
                if (note.pageName === window.location.pathname) {
                    renderCircle(note.id, note.title, note.color || "#ffffff"); 
                }
                if (note.image) workspaceData[note.id] = { x: 0, y: 0, zoom: 1, image: note.image };
            });
        } catch (err) { console.error(err); }
    }

    // РИСОВАНИЕ
    workspace.addEventListener('wheel', (e) => {
        if (currentId === null) return;
        e.preventDefault();
        scale = Math.min(Math.max(0.2, scale + (e.deltaY > 0 ? -0.1 : 0.1)), 3);
        ciklContainer.style.transform = `scale(${scale})`;
    }, { passive: false });

    holst.addEventListener('mousedown', (e) => {
        if (currentId === null) return;
        isDrawing = true;
        ctx.beginPath();
        const rect = holst.getBoundingClientRect();
        ctx.moveTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = holst.getBoundingClientRect();
        ctx.lineTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
    });

    window.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
            if (currentId !== null) {
                const imageData = holst.toDataURL();
                if (!workspaceData[currentId]) workspaceData[currentId] = {};
                workspaceData[currentId].image = imageData;
                fetch(`/update-note-image/${currentId}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ image: imageData })
                });
            }
        }
    });

    loadFromDb(); 
});