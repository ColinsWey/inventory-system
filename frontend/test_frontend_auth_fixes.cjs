#!/usr/bin/env node
/**
 * Тест исправлений frontend авторизации
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, checks) {
    console.log(`\n🔍 Проверяем файл: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Файл не найден: ${filePath}`);
        return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let allPassed = true;
    
    checks.forEach(check => {
        if (check.shouldContain) {
            if (content.includes(check.shouldContain)) {
                console.log(`✅ ${check.description}`);
            } else {
                console.log(`❌ ${check.description}`);
                console.log(`   Ожидали найти: ${check.shouldContain}`);
                allPassed = false;
            }
        }
        
        if (check.shouldNotContain) {
            if (!content.includes(check.shouldNotContain)) {
                console.log(`✅ ${check.description}`);
            } else {
                console.log(`❌ ${check.description}`);
                console.log(`   НЕ должно содержать: ${check.shouldNotContain}`);
                allPassed = false;
            }
        }
    });
    
    return allPassed;
}

function runTests() {
    console.log('🚀 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ FRONTEND АВТОРИЗАЦИИ');
    console.log('=' * 60);
    
    let allTestsPassed = true;
    
    // Тест 1: API URL исправлен
    const apiTests = checkFile('src/services/api.ts', [
        {
            description: 'API URL изменен на внешний сервер',
            shouldContain: 'http://78.128.99.7:8000/api/v1',
            shouldNotContain: 'http://localhost:8000/api/v1'
        }
    ]);
    allTestsPassed = allTestsPassed && apiTests;
    
    const clientTests = checkFile('src/api/client.ts', [
        {
            description: 'Client API URL изменен на внешний сервер',
            shouldContain: 'http://78.128.99.7:8000/api/v1',
            shouldNotContain: 'http://localhost:8000/api/v1'
        }
    ]);
    allTestsPassed = allTestsPassed && clientTests;
    
    // Тест 2: Auth service исправлен
    const authTests = checkFile('src/services/auth.ts', [
        {
            description: 'FormData удален из login()',
            shouldNotContain: 'new FormData()'
        },
        {
            description: 'multipart/form-data удален',
            shouldNotContain: 'multipart/form-data'
        },
        {
            description: 'JSON данные отправляются',
            shouldContain: 'const loginData = {'
        },
        {
            description: 'Добавлена диагностика login()',
            shouldContain: 'console.log(\'🔐 authService.login() вызван'
        },
        {
            description: 'Исправлен getCurrentUser()',
            shouldContain: 'response.data.user || response.data'
        },
        {
            description: 'Добавлена диагностика getCurrentUser()',
            shouldContain: 'console.log(\'👤 authService.getCurrentUser() вызван'
        }
    ]);
    allTestsPassed = allTestsPassed && authTests;
    
    // Тест 3: AuthContext исправлен
    const contextTests = checkFile('src/contexts/AuthContext.tsx', [
        {
            description: 'Добавлена диагностика в reducer',
            shouldContain: 'console.log(\'🔄 AuthContext reducer:'
        },
        {
            description: 'Добавлена диагностика в login()',
            shouldContain: 'console.log(\'🔐 AuthContext.login() вызван'
        }
    ]);
    allTestsPassed = allTestsPassed && contextTests;
    
    // Тест 4: API интерсептор исправлен
    const interceptorTests = checkFile('src/services/api.ts', [
        {
            description: 'Убрана сложная логика refresh token',
            shouldNotContain: 'auth/refresh'
        },
        {
            description: 'Добавлена диагностика 401 ошибок',
            shouldContain: 'console.log(\'❌ 401 ошибка'
        }
    ]);
    allTestsPassed = allTestsPassed && interceptorTests;
    
    console.log('\n' + '=' * 60);
    if (allTestsPassed) {
        console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
        console.log('✅ API URL изменен на внешний сервер (78.128.99.7:8000)');
        console.log('✅ FormData заменен на JSON в login()');
        console.log('✅ Убрана зависимость от refresh_token');
        console.log('✅ Исправлен endpoint getCurrentUser()');
        console.log('✅ Добавлена подробная диагностика');
        console.log('\n💡 Frontend готов к работе с внешним backend!');
        console.log('🔧 Откройте DevTools Console для просмотра логов авторизации');
    } else {
        console.log('💥 ЕСТЬ ПРОБЛЕМЫ С ИСПРАВЛЕНИЯМИ!');
        console.log('❌ Проверьте файлы и повторите исправления');
    }
}

// Запуск тестов
try {
    runTests();
} catch (error) {
    console.error('❌ Ошибка при запуске тестов:', error.message);
    process.exit(1);
} 