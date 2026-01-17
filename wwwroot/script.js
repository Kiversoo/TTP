document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('krugcontainer');
    const addBtn = document.getElementById('add-krug-btn');

    // 1. Функция отрисовки кружка (используем её и при загрузке, и при добавлении)
    function renderCircle(id) {
        const wrapper = document.createElement('div');
        wrapper.className = 'circle-wrapper';
        wrapper.setAttribute('data-id', id); 
        
        wrapper.innerHTML = `
            <div class="circle-icon"></div>
            <button class="delete-btn">x</button>
        `;

        // ВАЖНО: Находим кнопку удаления ИМЕННО внутри этого нового кружка
        const deleteBtn = wrapper.querySelector('.delete-btn');
        let timer; // Переменная для таймера

    // Когда мышка заходит на кружок
    wrapper.onmouseenter = () => {
        // Запускаем таймер на 3 секунды
        timer = setTimeout(() => {
            deleteBtn.disabled = false; // Включаем кнопку
        }, 1000);
    };

    // Когда мышка уходит с кружка
    wrapper.onmouseleave = () => {
        clearTimeout(timer); // Сбрасываем таймер, если ушли раньше 3 секунд
        deleteBtn.disabled = true; // Снова выключаем кнопку
    };

    deleteBtn.onclick = async () => {
        // Кнопка сработает только если disabled === false
        const response = await fetch(`/delete-note/${id}`, { method: 'DELETE' });
        if (response.ok) {
            wrapper.remove();
        }
    };

        container.appendChild(wrapper);
    }

    // 2. Загрузка всех кружков из базы при старте страницы
    async function loadFromDb() {
        try {
            const response = await fetch('/notes');
            const notes = await response.json();
            
            container.innerHTML = ''; // Очищаем контейнер перед загрузкой
            
            notes.forEach(note => {
                renderCircle(note.id); // Для каждого объекта из базы вызываем отрисовку
            });
        } catch (err) {
            console.error("Ошибка загрузки:", err);
        }
    }

    // 3. Клик по плюсу
    if (addBtn) {
        addBtn.onclick = async () => {
            const response = await fetch('/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'circle' })
            });

            if (response.ok) {
                const result = await response.json();
                renderCircle(result.id); 
            }
        };
    }

    loadFromDb(); 
});