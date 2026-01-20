document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('krugcontainer');
    const addBtn = document.getElementById('add-krug-btn');
    const workspace = document.getElementById('workspace');
    const ciklContainer = document.getElementById('cikl-container');
    const holst = document.getElementById('holst');
    const ctx = holst.getContext('2d');
    
    let workspaceData = {}; 
    let currentId = null;
    let scale = 1;
    let isDrawing = false;

    //--ОТРИСОВКА КРУЖКА--//
        function renderCircle(id) {
            if (!container) return; // Защита от ошибок
            const wrapper = document.createElement('div');
            wrapper.className = 'circle-wrapper';
            wrapper.setAttribute('data-id', id); 
        
            wrapper.innerHTML = `
            <div class="circle-icon"></div>
            <button class="delete-btn" disabled>x</button>
        `;
            //Выбор кружка
            wrapper.onclick = (event) => {
            if (event.target.classList.contains('delete-btn')) return;

            document.querySelectorAll('.circle-wrapper').forEach(w => w.classList.remove('active'));
            wrapper.classList.add('active');

        openWorkspace(id);
        
        };
    //--ОТКРЫТИЕ РАБОЧЕЙ ОБЛАСТИ КРУЖКА--//
        function openWorkspace(id) {
            const workspace = document.getElementById('workspace');
            const container = document.getElementById('cikl-container');
            const canvas = document.getElementById('holst');
            const ctx = canvas.getContext('2d');
            if (!workspace || !container || !canvas) return;

            ciklContainer.style.display = 'block';
            workspace.style.backgroundColor = '#f0f0f0';

            // Сохранение данных предыдущего кружка перед переключением
            if (currentId !== null) {
                workspaceData[currentId] = {
                    x: container.offsetLeft,
                    y: container.offsetTop,
                    zoom: scale,
                    image: canvas.toDataURL()
                }
            }

            currentId = id;

            console.log(`рабочее пространство для ID: ${id}`);

            // Загрузка данных или создание новых для выбранного кружка
            const data = workspaceData[id] || {x: 0, y: 0, zoom: 1, image: null};

            scale = data.zoom;
            container.style.transform = `scale(${scale})`;
            container.style.left = data.x + 'px';
            container.style.top = data.y + 'px';

            // Очистка и восстановление рисунка на холсте
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if(data.image) {
                const img = new Image();
                img.src = data.image;
                img.onload = () => ctx.drawImage(img, 0, 0);
            }
            console.log(`Рабочее пространство для ID: ${id}`);
        }

    //--ЛОГИКА ТАЙМЕРА КНОПКИ УДАЛЕНИЯ КРУЖКА--//
            container.appendChild(wrapper);

            const deleteBtn = wrapper.querySelector('.delete-btn');
            let timer;

            wrapper.onmouseenter = () => {
            // Таймер на 1 секунду (как в твоем последнем коде)
            timer = setTimeout(() => {
                deleteBtn.disabled = false; 
            }, 1000);
        };

            wrapper.onmouseleave = () => {
            clearTimeout(timer);
            deleteBtn.disabled = true; 
        };

    //--ЛОГИКА УДАЛЕНИЯ КРУЖКА И ОЧИСТКИ ПАМЯТИ--//
        deleteBtn.onclick = async (event) => {
            event.stopPropagation(); // Останавливаем клик, чтобы не открылся кружок перед удалением

            if (deleteBtn.disabled) return; 

            const response = await fetch(`/delete-note/${id}`, { method: 'DELETE' });
    
            if (response.ok) {
            delete workspaceData[id]; 

            if (currentId === id) {
            currentId = null; 
            const ciklContainer = document.getElementById('cikl-container');
            const holst = document.getElementById('holst');
            const ctx = holst.getContext('2d');
            ciklContainer.style.display = 'none'; 
            ctx.clearRect(0, 0, holst.width, holst.height); 
            const workspace = document.getElementById('workspace');
        }
            wrapper.remove();
    }
};

            container.appendChild(wrapper);
    }
   
    //--ФУНКЦИЯ: ЗАГРУЗКА ВСЕХ КРУЖКОВ ИЗ БАЗЫ ДАННЫХ--//
    async function loadFromDb() {
            if (!container) return;
            try {
            const response = await fetch('/notes');
            const notes = await response.json();
            container.innerHTML = '';
            const currentPath = window.location.pathname;

            notes.forEach(note => {
                if (note.pageName === currentPath) {
                    renderCircle(note.id)
                }
            });
           } catch (err) {
           console.error("Ошибка загрузки:", err);
        }
    }

    //--ЛОГИКА ДОБАВЛЕНИЕ НОВОГО КРУЖКА Кнопка + --//
            if (addBtn) {
            addBtn.onclick = async () => {
            const response = await fetch('/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: "circle",
                    pageName: window.location.pathname })
            });
            if (response.ok) {
                const result = await response.json();
                renderCircle(result.id); 
            }
        };
    }


//--ЛОГИКА КОЛЁСИКА--//

workspace.addEventListener('wheel', (e) => {
    if (currentId === null) return; // Если кружок не выбран — зум не работает
    
    e.preventDefault(); // Чтобы страница не дергалась вверх-вниз
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1; // delta — Направление кручения
    scale = Math.min(Math.max(0.2, scale + delta), 3); // Ограничиваем масштаб от 0.2 до 3

    const ciklContainer = document.getElementById('cikl-container');
    ciklContainer.style.transform = `scale(${scale})`; // Применяем зум
}, { passive: false });

//--ЛОГИКА РИСОВАТЬ--//

holst.addEventListener('mousedown', (e) => {
    isDrawing = true; // isDrawing — Начинаем рисовать
    ctx.beginPath(); // beginPath — Начинаем новую линию
    const rect = holst.getBoundingClientRect(); // Получаем координаты холста
    
    // moveTo — Ставим точку начала
    ctx.moveTo(
        (e.clientX - rect.left) / scale, 
        (e.clientY - rect.top) / scale
    );
});


window.addEventListener('mousemove', (e) => {
    if (!isDrawing) return; // if (!isDrawing) — Если кнопка НЕ зажата, выходим

    const rect = holst.getBoundingClientRect();

    ctx.lineTo(
        (e.clientX - rect.left) / scale, 
        (e.clientY - rect.top) / scale
    );
    
    ctx.strokeStyle = '#000000'; // Черный цвет
    ctx.lineWidth = 2 / scale;   // Тонкая линия
    ctx.stroke();                // Наносим на холст
});


window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false; // isDrawing — Выключаем режим рисования
        ctx.closePath();   // Завершаем линию
    }
});
    


    loadFromDb(); 
});