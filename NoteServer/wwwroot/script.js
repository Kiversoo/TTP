document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('krugcontainer');
    const addBtn = document.getElementById('add-krug-btn');
    const pageName = window.location.pathname;

    function renderCircle(id) {
        if (!container) return; // Защита от ошибок

        const wrapper = document.createElement('div');
        wrapper.className = 'circle-wrapper';
        wrapper.setAttribute('data-id', id); 
        
        // Кнопка изначально disabled!
        wrapper.innerHTML = `
            <div class="circle-icon"></div>
            <button class="delete-btn" disabled>x</button>
        `;

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

        deleteBtn.onclick = async () => {
            if (deleteBtn.disabled) return; 
            const response = await fetch(`/delete-note/${id}`, { method: 'DELETE' });
            if (response.ok) {
                wrapper.remove();
            }
        };

        container.appendChild(wrapper);
    }

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

    loadFromDb(); 
});