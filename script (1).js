
class MealInfoApp {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.setTodayDate();
    }

    initElements() {
        this.dateInput = document.getElementById('mealDate');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.mealInfo = document.getElementById('mealInfo');
        this.errorMessage = document.getElementById('errorMessage');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchMealInfo());
        this.dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchMealInfo();
            }
        });
    }

    setTodayDate() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        this.dateInput.value = formattedDate;
    }

    async searchMealInfo() {
        const selectedDate = this.dateInput.value;
        if (!selectedDate) {
            alert('날짜를 선택해 주세요.');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const mealData = await this.fetchMealData(selectedDate);
            this.displayMealInfo(mealData, selectedDate);
        } catch (error) {
            console.error('급식정보 조회 오류:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async fetchMealData(date) {
        // 날짜 형식을 YYYYMMDD로 변환
        const formattedDate = date.replace(/-/g, '');
        
        // CORS 문제를 해결하기 위해 프록시 서버 사용
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530079&MLSV_YMD=${formattedDate}`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
        
        if (!response.ok) {
            throw new Error('네트워크 오류가 발생했습니다.');
        }

        const xmlText = await response.text();
        return this.parseXMLData(xmlText);
    }

    parseXMLData(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // 오류 확인
        const error = xmlDoc.querySelector('RESULT CODE');
        if (error && error.textContent !== 'INFO-000') {
            throw new Error('급식 정보를 찾을 수 없습니다.');
        }

        const mealRows = xmlDoc.querySelectorAll('row');
        const meals = [];

        mealRows.forEach(row => {
            const mealData = {
                date: row.querySelector('MLSV_YMD')?.textContent || '',
                type: row.querySelector('MMEAL_SC_NM')?.textContent || '',
                menu: row.querySelector('DDISH_NM')?.textContent || '',
                schoolName: row.querySelector('SCHUL_NM')?.textContent || ''
            };
            meals.push(mealData);
        });

        return meals;
    }

    displayMealInfo(meals, selectedDate) {
        this.mealInfo.innerHTML = '';

        if (meals.length === 0) {
            this.mealInfo.innerHTML = `
                <div class="no-meal">
                    <p>😔 ${this.formatDate(selectedDate)}에는 급식 정보가 없습니다.</p>
                    <p>주말이나 공휴일일 수 있습니다.</p>
                </div>
            `;
            return;
        }

        const mealContainer = document.createElement('div');
        mealContainer.innerHTML = `<div class="meal-date">${this.formatDate(selectedDate)} 급식정보</div>`;

        // 급식 유형별로 그룹화
        const mealsByType = this.groupMealsByType(meals);

        Object.entries(mealsByType).forEach(([type, menu]) => {
            const mealTypeDiv = document.createElement('div');
            mealTypeDiv.className = 'meal-type';
            
            const typeIcon = this.getMealTypeIcon(type);
            
            mealTypeDiv.innerHTML = `
                <h3>${typeIcon} ${type}</h3>
                <div class="meal-items">
                    ${this.formatMenuItems(menu)}
                </div>
            `;
            
            mealContainer.appendChild(mealTypeDiv);
        });

        this.mealInfo.appendChild(mealContainer);
    }

    groupMealsByType(meals) {
        const grouped = {};
        meals.forEach(meal => {
            if (!grouped[meal.type]) {
                grouped[meal.type] = meal.menu;
            }
        });
        return grouped;
    }

    formatMenuItems(menu) {
        const items = menu.split('<br/>').filter(item => item.trim() !== '');
        return items.map(item => {
            // 알레르기 정보 제거 (숫자.형태)
            const cleanItem = item.replace(/\d+\./g, '').trim();
            return `<div class="meal-item">${cleanItem}</div>`;
        }).join('');
    }

    getMealTypeIcon(type) {
        const icons = {
            '조식': '🌅',
            '중식': '🍽️',
            '석식': '🌙',
            '점심': '🍽️',
            '저녁': '🌙',
            '아침': '🌅'
        };
        return icons[type] || '🍴';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
        };
        return date.toLocaleDateString('ko-KR', options);
    }

    showLoading() {
        this.loading.classList.remove('hidden');
        this.mealInfo.innerHTML = '';
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    showError() {
        this.errorMessage.classList.remove('hidden');
        this.mealInfo.innerHTML = '';
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MealInfoApp();
});
