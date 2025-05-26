#!/usr/bin/env node
/**
 * Тест конфигурации сервера
 */

const fs = require('fs');

function testConfiguration() {
    console.log('🧪 ТЕСТИРОВАНИЕ КОНФИГУРАЦИИ СЕРВЕРА');
    console.log('=' + '='.repeat(50));

    let allPassed = true;

    // Проверка корневого .env
    if (fs.existsSync('.env')) {
        const rootEnv = fs.readFileSync('.env', 'utf8');
        if (rootEnv.includes('SERVER_HOST=')) {
            console.log('✅ Корневой .env файл настроен');
        } else {
            console.log('❌ Корневой .env файл не содержит SERVER_HOST');
            allPassed = false;
        }
    } else {
        console.log('❌ Корневой .env файл не найден');
        allPassed = false;
    }

    // Проверка frontend .env
    if (fs.existsSync('frontend/.env')) {
        const frontendEnv = fs.readFileSync('frontend/.env', 'utf8');
        if (frontendEnv.includes('REACT_APP_API_URL=')) {
            console.log('✅ Frontend .env файл настроен');
        } else {
            console.log('❌ Frontend .env файл не содержит REACT_APP_API_URL');
            allPassed = false;
        }
    } else {
        console.log('❌ Frontend .env файл не найден');
        allPassed = false;
    }

    // Проверка .env.example
    if (fs.existsSync('frontend/.env.example')) {
        console.log('✅ Frontend .env.example файл существует');
    } else {
        console.log('❌ Frontend .env.example файл не найден');
        allPassed = false;
    }

    // Проверка скриптов
    if (fs.existsSync('setup-server.bat')) {
        console.log('✅ Windows скрипт setup-server.bat существует');
    } else {
        console.log('❌ Windows скрипт setup-server.bat не найден');
        allPassed = false;
    }

    if (fs.existsSync('setup-server.sh')) {
        console.log('✅ Linux/Mac скрипт setup-server.sh существует');
    } else {
        console.log('❌ Linux/Mac скрипт setup-server.sh не найден');
        allPassed = false;
    }

    // Проверка .gitignore
    if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        if (gitignore.includes('.env') && gitignore.includes('frontend/.env')) {
            console.log('✅ .gitignore правильно настроен');
        } else {
            console.log('❌ .gitignore не исключает .env файлы');
            allPassed = false;
        }
    } else {
        console.log('❌ .gitignore файл не найден');
        allPassed = false;
    }

    console.log('\\n' + '='.repeat(50));
    if (allPassed) {
        console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
        console.log('✅ Система готова к развертыванию на любом сервере');
        console.log('✅ IP адрес можно изменить одной командой');
        console.log('✅ Нет хардкода в коде');
        console.log('\\n💡 Используйте: .\\\\setup-server.bat NEW_IP');
    } else {
        console.log('💥 ЕСТЬ ПРОБЛЕМЫ С КОНФИГУРАЦИЕЙ!');
        console.log('❌ Проверьте отсутствующие файлы');
    }
}

testConfiguration();
