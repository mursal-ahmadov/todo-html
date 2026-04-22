document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let currentFilter = 'all';

    function renderTodos() {
        todoList.innerHTML = '';
        
        let filteredTodos = todos;
        if (currentFilter === 'pending') {
            filteredTodos = todos.filter(todo => !todo.completed);
        } else if (currentFilter === 'completed') {
            filteredTodos = todos.filter(todo => todo.completed);
        }

        if (filteredTodos.length === 0) {
            todoList.innerHTML = '<li class="empty-state">Heç bir tapşırıq yoxdur</li>';
            return;
        }

        filteredTodos.forEach((todo) => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <div class="todo-text" onclick="toggleTodo(${todo.id})">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} onclick="event.stopPropagation(); toggleTodo(${todo.id})">
                    <span>${escapeHTML(todo.text)}</span>
                </div>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteTodo(${todo.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            todoList.appendChild(li);
        });
    }

    function addTodo() {
        const text = todoInput.value.trim();
        if (text !== '') {
            todos.push({
                id: Date.now(),
                text: text,
                completed: false
            });
            saveAndRender();
            todoInput.value = '';
        }
    }

    window.toggleTodo = function(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                todo.completed = !todo.completed;
            }
            return todo;
        });
        saveAndRender();
    };

    window.deleteTodo = function(id) {
        todos = todos.filter(todo => todo.id !== id);
        saveAndRender();
    };

    function saveAndRender() {
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos();
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    addBtn.addEventListener('click', addTodo);
    
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    // İlk yüklənmə
    renderTodos();
});