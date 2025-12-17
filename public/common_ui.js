// 获取聊天容器元素
console.log('common_ui.js 开始执行');

// 检查 DOM 是否可用
function isDOMReady() {
    return typeof document !== 'undefined' && document.readyState === 'complete';
}

// 等待 DOM 加载完成后再获取元素
function initCommonUI() {
    try {
        console.log('common_ui.js 开始初始化 UI 元素');
        
        // 检查 document 对象是否存在
        if (typeof document === 'undefined') {
            console.warn('common_ui.js: document 对象不存在，等待 DOM 环境');
            return false;
        }
        
        const chatContainer = document.getElementById('chat-container');
        console.log('chatContainer:', chatContainer);
        const chatContentWrapper = document.getElementById('chat-content-wrapper');
        const toggleBtn = document.getElementById('toggle-chat-btn');
        const sidebar = document.getElementById('sidebar');
        const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        const sidebarbox = document.getElementById('sidebarbox');
        
        if (!chatContainer) {
            console.warn('common_ui.js: chatContainer 元素未找到');
            return false;
        }
        if (!chatContentWrapper) {
            console.warn('common_ui.js: chatContentWrapper 元素未找到');
            return false;
        }
        if (!toggleBtn) {
            console.warn('common_ui.js: toggleBtn 元素未找到');
            return false;
        }
        if (!sidebar) {
            console.warn('common_ui.js: sidebar 元素未找到');
            return false;
        }
        if (!toggleSidebarBtn) {
            console.warn('common_ui.js: toggleSidebarBtn 元素未找到');
            return false;
        }
        if (!sidebarbox) {
            console.warn('common_ui.js: sidebarbox 元素未找到');
            return false;
        }
        
        console.log('common_ui.js: 所有 UI 元素获取成功');
        
        // 初始化所有功能
        initChatFunctions(chatContainer, chatContentWrapper, toggleBtn);
        initSidebarFunctions(sidebar, toggleSidebarBtn, sidebarbox);
        initAutoScroll(chatContentWrapper);
        initAutoFolding(sidebar, toggleSidebarBtn, sidebarbox);
        
        return true;
    } catch (error) {
        console.error('common_ui.js 初始化错误:', error);
        return false;
    }
}

// 智能初始化：根据 DOM 状态选择初始化方式
function smartInit() {
    if (typeof document === 'undefined') {
        console.log('common_ui.js: document 对象不存在，等待 DOM 环境');
        // 等待 document 对象可用
        const checkDocument = setInterval(() => {
            if (typeof document !== 'undefined') {
                clearInterval(checkDocument);
                console.log('common_ui.js: document 对象已可用，开始初始化');
                smartInit();
            }
        }, 100);
        return;
    }
    
    if (document.readyState === 'loading') {
        console.log('common_ui.js: DOM 正在加载，等待 DOMContentLoaded 事件');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('common_ui.js: DOMContentLoaded 触发，开始初始化');
            initCommonUI();
        });
    } else {
        console.log('common_ui.js: DOM 已就绪，立即初始化');
        initCommonUI();
    }
}

// 开始智能初始化
smartInit();



// 聊天功能初始化
function initChatFunctions(chatContainer, chatContentWrapper, toggleBtn) {
    console.log('common_ui.js: 初始化聊天功能');
    
    // 定义一个滚动到底部的函数
    function scrollToBottom() {
        if (chatContentWrapper && !chatContainer.classList.contains('minimized')) {
            chatContentWrapper.scrollTop = chatContentWrapper.scrollHeight;
        }
    }
    
    // --- 添加新消息函数 (修正) ---
    function addNewMessage(messageHTML) {
        if (!chatContentWrapper) return; // 安全检查

        const newMessageElement = document.createElement('div');
        newMessageElement.innerHTML = messageHTML;
        chatContentWrapper.appendChild(newMessageElement);

        // 确保在添加消息后立即滚动到底部
        setTimeout(scrollToBottom, 10); // 短暂延迟确保DOM更新
    }
    
    // --- 切换聊天框最小化/展开状态 ---
    toggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();

        const isMinimized = chatContainer.classList.toggle('minimized');

        if (isMinimized) {
            // 刚刚最小化
            toggleBtn.textContent = '+';
            toggleBtn.title = 'Restore';
        } else {
            // 刚刚还原展开
            toggleBtn.textContent = '-';
            toggleBtn.title = 'Minimize';
            // 还原后滚动到底部
            setTimeout(scrollToBottom, 300); // 给CSS过渡留出时间
        }
    });

    // 让最小化后的小方块本身也能点击还原
    chatContainer.addEventListener('click', (event) => {
        if (chatContainer.classList.contains('minimized') && event.target === chatContainer) {
            toggleBtn.click();
        }
    });
    
    // 设置初始按钮状态
    if (chatContainer.classList.contains('minimized')) {
        toggleBtn.textContent = '+';
        toggleBtn.title = 'Restore';
    } else {
        toggleBtn.textContent = '-';
        toggleBtn.title = 'Minimize';
        setTimeout(scrollToBottom, 100); // 初始加载时滚动一次
    }
    
    // 将函数暴露到全局，供其他脚本使用
    window.addNewMessage = addNewMessage;
    window.scrollToBottom = scrollToBottom;
}


// 侧边栏功能初始化
function initSidebarFunctions(sidebar, toggleSidebarBtn, sidebarbox) {
    console.log('common_ui.js: 初始化侧边栏功能');
    
    // 获取组件尺寸
    let sidebarboxWidth = sidebarbox.offsetWidth || 652;
    let sidebarboxHeight = sidebarbox.offsetHeight || 308;
    let maxsidebarboxWidth = sidebarboxWidth; // 组件最大宽度用于css平滑缩放（默认值）
    let maxsidebarboxHeight = sidebarboxHeight; // 组件最大高度用于css平滑缩放（默认值）
    
    // --- Sidebar 折叠/展开功能 ---
    toggleSidebarBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isMinimized = sidebar.classList.toggle('minimized');
        if (isMinimized) {
            toggleSidebarBtn.textContent = '+';
            toggleSidebarBtn.title = '展开侧边栏';
            sidebar.style.width = sidebar.style.height = '48px';
        } else {
            toggleSidebarBtn.textContent = '-';
            toggleSidebarBtn.title = '折叠侧边栏';
            sidebar.style.width = maxsidebarboxWidth + 'px';
            sidebar.style.height = maxsidebarboxHeight + 'px';
        }
    });

    // 允许点击整个 sidebar 区域还原
    sidebar.addEventListener('click', (event) => {
        if (sidebar.classList.contains('minimized') && event.target === sidebar) {
            toggleSidebarBtn.click();
        }
    });
    
    // 设置初始按钮状态
    if (sidebar.classList.contains('minimized')) {
        toggleSidebarBtn.textContent = '+';
        toggleSidebarBtn.title = '展开侧边栏';
    } else {
        toggleSidebarBtn.textContent = '-';
        toggleSidebarBtn.title = '折叠侧边栏';
    }
    
    // 设置sidebar大小以应用于css平滑缩放
    sidebar.style.width = maxsidebarboxWidth + 'px';
    sidebar.style.height = maxsidebarboxHeight + 'px';
}

// 自动滚动功能初始化
function initAutoScroll(chatContentWrapper) {
    console.log('common_ui.js: 初始化自动滚动功能');
    
    // 监听 DOM 变化，确保新内容添加后自动滚动
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                if (window.scrollToBottom) {
                    window.scrollToBottom();
                }
            }
        });
    });

    // 开始观察聊天内容区域的变化
    observer.observe(chatContentWrapper, {childList: true, subtree: true});
}


// 自动折叠功能初始化
function initAutoFolding(sidebar, toggleSidebarBtn, sidebarbox) {
    console.log('common_ui.js: 初始化自动折叠功能');
    
    // 获取组件尺寸
    let sidebarboxWidth = sidebarbox.offsetWidth || 652;
    let sidebarboxHeight = sidebarbox.offsetHeight || 308;
    let maxsidebarboxWidth = sidebarboxWidth; // 组件最大宽度用于css平滑缩放（默认值）
    let maxsidebarboxHeight = sidebarboxHeight; // 组件最大高度用于css平滑缩放（默认值）

    const updateSidebarDimensions = () => {
        if (window.innerWidth < 768) { // 检测屏幕尺寸，不建议修改
            sidebar.style.height = 'unset';
            // maxsidebarboxWidth = "90vw"; // 把90vw转换为px
            maxsidebarboxWidth = window.innerWidth * 0.9 || 652; // 计算90vw的px值
        } else {
            sidebar.style.width = sidebar.style.height = 'unset';
            maxsidebarboxWidth = sidebarbox.offsetWidth || 652;
        }
        sidebar.style.width = maxsidebarboxWidth + 'px';
        maxsidebarboxHeight = sidebarbox.offsetHeight || 308;
        sidebar.style.height = maxsidebarboxHeight + 'px';
        console.log("新的最大高度是: " + sidebar.style.height + "，新的最大宽度是: " + sidebar.style.width);
    }
    window.addEventListener('resize', updateSidebarDimensions);
    updateSidebarDimensions();

    // 只有自动收缩（定时器或失去焦点）导致最小化后，悬停才会触发展开（仅PC端处理）
    function isMobileDevice() { // 检测方法2选1
        // return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if(window.innerWidth < 768) {
            return true; // 如果屏幕宽度小于768px，认为是移动设备
        } else {
            return false; // 否则认为是PC端
        }
    }

    let autoMinimized = false;

    if (!isMobileDevice()) {
        sidebar.addEventListener('mouseenter', () => {
            // 仅自动收缩导致最小化时才允许悬停展开
            if (sidebar.classList.contains('minimized') && autoMinimized) {
                toggleSidebarBtn.click();
                autoMinimized = false;
            }
        });
    }
    
    // 页面打开时延迟3秒自动收缩 sidebar
    // window.addEventListener('DOMContentLoaded', () => {
    //     if (!sidebar.classList.contains('minimized')) {
    //         setTimeout(() => {
    //             toggleSidebarBtn.click();
    //             autoMinimized = true;
    //         }, 3000);
    //     }
    // });

    // PC端：鼠标离开 sidebar 时延迟5秒收缩
    sidebar.addEventListener('mouseleave', () => {
        if (!sidebar.classList.contains('minimized') && !isMobileDevice()) {
            setTimeout(() => {
                if (!sidebar.classList.contains('minimized')) {
                    toggleSidebarBtn.click();
                    autoMinimized = true;
                }
            }, 5000);
        }
    });

    // 移动端：点击页面其它区域时自动收缩 sidebar
    if (isMobileDevice()) {
        document.addEventListener('touchstart', (e) => {
            if (!sidebar.classList.contains('minimized')) {
                if (!sidebar.contains(e.target)) {
                    toggleSidebarBtn.click();
                    autoMinimized = true;
                }
            }
        }, {passive: true});
        // 使 sidebar 可聚焦（可保留）
        sidebar.setAttribute('tabindex', '0');
    }
}
