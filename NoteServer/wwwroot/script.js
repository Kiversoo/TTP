document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('krugcontainer');
    const addBtn = document.getElementById('add-krug-btn');
    const workspace = document.getElementById('workspace');
    const ciklContainer = document.getElementById('cikl-container');
    const holst = document.getElementById('holst');
    const ctx = holst.getContext('2d');
    const modal = document.getElementById('add-doska');
    const titleInput = document.getElementById('note-title');
    
    let workspaceData = {}; 
    let currentId = null;
    let scale = 1;
    let isDrawing = false;

    // --- ЛОГИКА МОДАЛЬНОГО ОКНА ---

    addBtn.onclick = () => {
        modal.classList.add('active');
        titleInput.value = "";
        titleInput.focus();
    };

    document.getElementById('cancel-doska').onclick = () => {
        modal.classList.remove('active');
    };

    document.getElementById('confirm-doska').onclick = async () => {
        const title = titleInput.value.trim();

        const response = await fetch('/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                pageName: window.location.pathname
            })
        });

        if (response.ok) {
            const result = await response.json();
            renderCircle(result.id, title);
            modal.classList.remove('active'); // modal, потому что ты его так объявил выше
        }
    };

    // --- ОТРИСОВКА КРУЖКА ---

    function renderCircle(id, title = "") {
        if (!container) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'circle-wrapper';
        wrapper.setAttribute('data-id', id); 
        
        wrapper.innerHTML = `
            <div class="circle-label">${title}</div>
            <div class="circle-icon"></div>
            <button class="delete-btn" disabled>x</button>
        `;

        // Клик по кружку (выбор)
        wrapper.onclick = (event) => {
            if (event.target.classList.contains('delete-btn')) return;
            document.querySelectorAll('.circle-wrapper').forEach(w => w.classList.remove('active'));
            wrapper.classList.add('active');
            openWorkspace(id);
        };

        // Логика кнопки удаления
        const deleteBtn = wrapper.querySelector('.delete-btn');
        let timer;

        wrapper.onmouseenter = () => {
            timer = setTimeout(() => { deleteBtn.disabled = false; }, 1000);
        };

        wrapper.onmouseleave = () => {
            clearTimeout(timer);
            deleteBtn.disabled = true; 
        };

        deleteBtn.onclick = async (event) => {
            event.stopPropagation();
            if (deleteBtn.disabled) return; 

            const response = await fetch(`/delete-note/${id}`, { method: 'DELETE' });
            if (response.ok) {
                delete workspaceData[id]; 
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

    // --- РАБОЧАЯ ОБЛАСТЬ (ХОЛСТ) ---

    function openWorkspace(id) {
        if (!workspace || !ciklContainer || !holst) return;

        ciklContainer.style.display = 'block';
        workspace.style.backgroundColor = '#f0f0f0';

        // Сохраняем старый рисунок перед переключением
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

    // --- ЗАГРУЗКА ИЗ БАЗЫ ---

    async function loadFromDb() {
        try {
            const response = await fetch('/notes');
            const notes = await response.json();
            container.innerHTML = '';
            const currentPath = window.location.pathname;

            notes.forEach(note => {
                if (note.pageName === currentPath) {
                    renderCircle(note.id, note.title); // Передаем и ID, и Заголовок
                }
                if (note.image) {
                    workspaceData[note.id] = { x: 0, y: 0, zoom: 1, image: note.image };
                }
            });
        } catch (err) {
            console.error("Ошибка загрузки:", err);
        }
    }

    // --- СОБЫТИЯ МЫШИ (РИСОВАНИЕ И ЗУМ) ---

    workspace.addEventListener('wheel', (e) => {
        if (currentId === null) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.min(Math.max(0.2, scale + delta), 3);
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
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
    });

    window.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            if (currentId !== null) {
                const imageData = holst.toDataURL();
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