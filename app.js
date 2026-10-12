let currentMode = 'eat';
let currentResult = null;
let wheelPool = [];
let activeFilter = '全部'; 
let isAnimating = false; // 用來防止動畫途中重複點擊

function switchScreen(screenId, navElement = null) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navElement.classList.add('active');
    }
}

function startLottery(mode) {
    currentMode = mode;
    activeFilter = '全部';
    document.getElementById('lottery-title').innerText = mode === 'eat' ? '🍔 今天吃什麼？' : '🧋 今天喝什麼？';
    
    generateFilters(); 
    updateWheelPool(); 
    
    // 讓扭蛋機本身也可以點擊（提升 UX 體驗）
    const machine = document.getElementById('gacha-machine');
    if (machine) {
        machine.style.cursor = 'pointer';
        machine.onclick = executeDraw;
    }

    switchScreen('screen-lottery');
}

function generateFilters() {
    const container = document.getElementById('filter-container');
    const categories = ['全部', ...new Set(database[currentMode].map(item => item.category))];
    
    let selectHTML = `<select id="category-select" class="custom-select" onchange="setFilter(this.value)">`;
    selectHTML += categories.map(cat => 
        `<option value="${cat}" ${cat === activeFilter ? 'selected' : ''}>${cat}</option>`
    ).join('');
    selectHTML += `</select>`;
    
    container.innerHTML = selectHTML;
}

function setFilter(category) {
    activeFilter = category;
    generateFilters(); 
    updateWheelPool(); 
}

function updateWheelPool() {
    const blacklistIds = UserData.getBlacklist().map(b => b.id);
    wheelPool = database[currentMode].filter(item => {
        const notBlacklisted = !blacklistIds.includes(item.id);
        const matchesFilter = (activeFilter === '全部' || item.category === activeFilter);
        return notBlacklisted && matchesFilter;
    });

    if (wheelPool.length === 0) {
        alert("此分類下沒有店家，或都已經在你的黑名單中了！");
        return;
    }
    
    // 🔥 重置扭蛋機與 UI 狀態 (新增確保扭蛋機顯示的程式碼)
    document.getElementById('gacha-machine-container').style.display = 'flex'; 
    
    const droppedBall = document.getElementById('dropped-ball');
    if(droppedBall) {
        droppedBall.style.display = 'none';
        droppedBall.classList.remove('ball-opening');
    }
    document.getElementById('gacha-hint').innerHTML = "按下「開始轉動」抽出今天的救星！";
    document.getElementById('btn-draw').style.display = 'block';
    document.getElementById('result-card').style.display = 'none';
    isAnimating = false;
}

function executeDraw() {
    if (wheelPool.length === 0) {
        alert("請先解除一些黑名單或更換分類！");
        return;
    }

    if (isAnimating) return; // 動畫執行中，禁止操作
    isAnimating = true;

    document.getElementById('btn-draw').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    
    // 確保掉落的球是隱藏的
    const droppedBall = document.getElementById('dropped-ball');
    if(droppedBall) {
        droppedBall.style.display = 'none';
        droppedBall.classList.remove('ball-opening');
    }

    // 決定抽獎結果
    let targetIndex;
    if (wheelPool.length > 1 && currentResult !== null) {
        do { targetIndex = Math.floor(Math.random() * wheelPool.length); } 
        while (wheelPool[targetIndex].id === currentResult.id);
    } else {
        targetIndex = Math.floor(Math.random() * wheelPool.length);
    }
    currentResult = wheelPool[targetIndex];

    // 1. 只讓「內部的球」開始攪拌滾動 (扭蛋機圖片維持不動)
    document.getElementById('inner-balls').classList.add('mixing');
    document.getElementById('gacha-hint').innerText = "內部洗牌中...";

    // 2. 等待 2 秒後停止滾動，並掉出扭蛋
    setTimeout(() => {
        document.getElementById('inner-balls').classList.remove('mixing');
        
        // 顯示掉出來的球 
        if(droppedBall) {
            droppedBall.style.display = 'block';
        }
        document.getElementById('gacha-hint').innerHTML = "✨ 扭蛋掉出來了！<br><b>👉 點擊扭蛋打開它 👈</b> ✨";
    }, 2000);
}

function openGacha() {
    const droppedBall = document.getElementById('dropped-ball');
    
    // 播放扭蛋打開(放大消失)動畫
    droppedBall.classList.add('ball-opening');
    document.getElementById('gacha-hint').innerText = "打開中...";

    // 等待 0.4 秒動畫播完後，顯示結果卡
    setTimeout(() => {
        triggerConfetti(); // 噴發彩帶
        droppedBall.style.display = 'none'; // 徹底隱藏扭蛋
        document.getElementById('gacha-hint').innerText = "🎉 登登登！這就是今天的救星 🎉"; 
        
        showResultCard(currentResult); // 顯示店家地圖資訊
        isAnimating = false; // 解除鎖定
    }, 400);
}

function resetAndDraw() { executeDraw(); }

function showResultCard(item) {
    document.getElementById('res-name').innerText = `${item.icon} ${item.name}`;
    document.getElementById('res-address').innerText = `📍 ${item.address}`;
    document.getElementById('res-phone').innerText = `📞 ${item.phone}`;
    document.getElementById('res-hours').innerText = `⏰ ${item.hours}`;
    
    const mapQuery = encodeURIComponent(`${item.name} ${item.address}`);
    document.getElementById('res-map-frame').src = `https://maps.google.com/maps?q=${mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    document.getElementById('res-map-link').href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
    
    updateFavoriteBtn();
    document.getElementById('result-card').style.display = 'flex';
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ff7e5f', '#feb47b', '#ffffff'] });
    }
}

function handleFavorite() {
    UserData.toggleFavorite(currentResult);
    updateFavoriteBtn();
}

function updateFavoriteBtn() {
    const btn = document.getElementById('btn-fav');
    btn.innerText = UserData.isFavorite(currentResult.id) ? "❤️ 已最愛" : "🤍 最愛";
}

function handleBlacklist() {
    if(confirm(`確定把「${currentResult.name}」加入黑名單？`)) {
        UserData.addBlacklist(currentResult);
        alert("已加入黑名單 ❌");
        updateWheelPool(); 
    }
}

function handleCheckIn() {
    UserData.addHistory(currentResult);
    alert(`✅ 打卡成功！已將 ${currentResult.name} 寫入歷史紀錄。`);
}

function viewList(type, navElement = null) {
    const listContent = document.getElementById('list-content');
    const listTitle = document.getElementById('list-title');
    listContent.innerHTML = ''; 
    
    let data = [];
    if (type === 'favorites') { data = UserData.getFavorites(); listTitle.innerText = '❤️ 最愛清單'; }
    else if (type === 'blacklist') { data = UserData.getBlacklist(); listTitle.innerText = '❌ 黑名單'; }
    else if (type === 'history') { data = UserData.getHistory(); listTitle.innerText = '📅 打卡紀錄'; }
    else if (type === 'menu') { 
        // 🔥 新增：如果是菜單模式，就把吃跟喝的資料合在一起顯示
        data = [...database.eat, ...database.drink]; 
        listTitle.innerText = '📖 菜單總覽'; 
    }

    if (data.length === 0) {
        listContent.innerHTML = '<p style="text-align: center; color: #888; margin-top: 50px;">目前沒有資料喔！</p>';
    } else {
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'info-card';
            
            let extraHTML = '';
            if (type === 'history') {
                extraHTML = `<p style="font-size: 12px; color: #888;">🗓️ 打卡時間：${item.date}</p>`;
            } else if (type === 'favorites' || type === 'blacklist') {
                extraHTML = `<button class="btn ${type === 'favorites' ? 'btn-outline' : 'btn-danger'}" 
                           style="padding: 8px; margin-top: 10px; font-size: 14px;"
                           onclick="removeFromList('${type}', '${item.id}')">
                       ${type === 'favorites' ? '💔 移除' : '✅ 解除'}
                   </button>`;
            } else if (type === 'menu') {
                // 🔥 新增：菜單模式下出現「直接指定」按鈕
                extraHTML = `<button class="btn btn-primary" 
                           style="padding: 8px; margin-top: 10px; font-size: 14px;"
                           onclick="directSelect('${item.id}')">
                       👉 直接吃這家
                   </button>`;
            }

            card.innerHTML = `
                <h3 style="margin: 0 0 5px 0; color: var(--primary-color);">${item.icon || ''} ${item.name} <span style="font-size:12px; font-weight:normal; color:#888;">(${item.category})</span></h3>
                <p style="font-size: 14px; margin: 3px 0;">📍 ${item.address}</p>
                ${extraHTML}
            `;
            listContent.appendChild(card);
        });
    }
    
    switchScreen('screen-list', navElement);
}

// 🔥 全新功能：直接指定想吃的店家
function directSelect(id) {
    const allItems = [...database.eat, ...database.drink];
    currentResult = allItems.find(i => i.id === id);
    
    // 切換回首頁導覽狀態
    const homeNav = document.querySelector('#bottom-nav button:first-child');
    switchScreen('screen-lottery', homeNav);
    
    // 隱藏扭蛋機區塊，直接跳出結果與地圖
    document.getElementById('gacha-machine-container').style.display = 'none';
    document.getElementById('gacha-hint').innerText = "✨ 您直接指定了這家店！ ✨";
    document.getElementById('btn-draw').style.display = 'none';
    
    showResultCard(currentResult);
}

function removeFromList(type, itemId) {
    if (type === 'favorites') {
        let favs = UserData.getFavorites().filter(f => f.id !== itemId);
        localStorage.setItem('favorites', JSON.stringify(favs));
        viewList('favorites'); 
    } else if (type === 'blacklist') {
        let bl = UserData.getBlacklist().filter(b => b.id !== itemId);
        localStorage.setItem('blacklist', JSON.stringify(bl));
        viewList('blacklist'); 
    }
}