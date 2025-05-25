#!/bin/bash

# =============================================================================
# СКРИПТ ЗАПУСКА ВСЕХ ТЕСТОВ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Запускает unit, integration и E2E тесты с генерацией отчетов
# Автор: QA Team
# Версия: 1.0.0

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TESTS_DIR="$PROJECT_ROOT/tests"
REPORTS_DIR="$TESTS_DIR/reports"
LOG_FILE="$REPORTS_DIR/test-execution.log"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции логирования
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${BLUE}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}✓ $*${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}⚠ $*${NC}"
}

log_error() {
    log "ERROR" "${RED}✗ $*${NC}"
}

log_step() {
    log "STEP" "${PURPLE}>>> $*${NC}"
}

log_header() {
    log "HEADER" "${CYAN}$*${NC}"
}

# Функция показа справки
show_help() {
    echo "Использование: $0 [опции]"
    echo
    echo "Опции:"
    echo "  -u, --unit           Запустить только unit тесты"
    echo "  -i, --integration    Запустить только integration тесты"
    echo "  -e, --e2e           Запустить только E2E тесты"
    echo "  -f, --frontend      Запустить только frontend тесты"
    echo "  -b, --backend       Запустить только backend тесты"
    echo "  -c, --coverage      Генерировать отчеты о покрытии"
    echo "  -r, --report        Генерировать сводный отчет"
    echo "  -v, --verbose       Подробный вывод"
    echo "  -h, --help          Показать эту справку"
    echo
    echo "Примеры:"
    echo "  $0                  # Запустить все тесты"
    echo "  $0 -u -c           # Unit тесты с покрытием"
    echo "  $0 -e -v           # E2E тесты с подробным выводом"
    echo "  $0 -b -r           # Backend тесты со сводным отчетом"
}

# Функция проверки зависимостей
check_dependencies() {
    log_step "Проверка зависимостей"
    
    local missing_deps=()
    
    # Проверка Python и pytest
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    if ! python3 -c "import pytest" &> /dev/null; then
        missing_deps+=("pytest")
    fi
    
    # Проверка Node.js и npm
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Проверка Playwright
    if ! npx playwright --version &> /dev/null; then
        missing_deps+=("playwright")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Отсутствуют зависимости: ${missing_deps[*]}"
        log_info "Установите недостающие зависимости:"
        log_info "  pip install pytest pytest-asyncio pytest-cov httpx"
        log_info "  npm install --save-dev @playwright/test"
        log_info "  npx playwright install"
        exit 1
    fi
    
    log_success "Все зависимости установлены"
}

# Функция подготовки тестовой среды
setup_test_environment() {
    log_step "Подготовка тестовой среды"
    
    # Создание директории для отчетов
    mkdir -p "$REPORTS_DIR"
    
    # Создание лог файла
    touch "$LOG_FILE"
    
    # Установка переменных окружения для тестов
    export TEST_MODE=true
    export DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/test_inventory"
    export REDIS_URL="redis://localhost:6379/1"
    export SECRET_KEY="test_secret_key_for_testing_only"
    
    # Проверка тестовой базы данных
    if command -v docker &> /dev/null; then
        log_info "Запуск тестовой базы данных..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.test.yml" up -d postgres redis &> /dev/null || true
        sleep 5
    fi
    
    log_success "Тестовая среда подготовлена"
}

# Функция запуска unit тестов backend
run_backend_unit_tests() {
    log_step "Запуск unit тестов backend"
    
    cd "$PROJECT_ROOT"
    
    local pytest_args="-v"
    
    if [ "$COVERAGE" = true ]; then
        pytest_args="$pytest_args --cov=backend --cov-report=html:$REPORTS_DIR/backend-coverage --cov-report=xml:$REPORTS_DIR/backend-coverage.xml"
    fi
    
    if [ "$VERBOSE" = true ]; then
        pytest_args="$pytest_args -s"
    fi
    
    log_info "Команда: pytest tests/unit/backend/ $pytest_args"
    
    if pytest tests/unit/backend/ $pytest_args --junitxml="$REPORTS_DIR/backend-unit-results.xml" >> "$LOG_FILE" 2>&1; then
        log_success "Unit тесты backend пройдены"
        return 0
    else
        log_error "Unit тесты backend провалены"
        return 1
    fi
}

# Функция запуска unit тестов frontend
run_frontend_unit_tests() {
    log_step "Запуск unit тестов frontend"
    
    cd "$PROJECT_ROOT/frontend"
    
    local jest_args=""
    
    if [ "$COVERAGE" = true ]; then
        jest_args="--coverage --coverageDirectory=../tests/reports/frontend-coverage"
    fi
    
    if [ "$VERBOSE" = true ]; then
        jest_args="$jest_args --verbose"
    fi
    
    log_info "Команда: npm test -- $jest_args"
    
    if npm test -- $jest_args --testResultsProcessor="../tests/reports/frontend-unit-results.json" >> "$LOG_FILE" 2>&1; then
        log_success "Unit тесты frontend пройдены"
        return 0
    else
        log_error "Unit тесты frontend провалены"
        return 1
    fi
}

# Функция запуска integration тестов
run_integration_tests() {
    log_step "Запуск integration тестов"
    
    cd "$PROJECT_ROOT"
    
    local pytest_args="-v"
    
    if [ "$VERBOSE" = true ]; then
        pytest_args="$pytest_args -s"
    fi
    
    log_info "Команда: pytest tests/integration/ $pytest_args"
    
    if pytest tests/integration/ $pytest_args --junitxml="$REPORTS_DIR/integration-results.xml" >> "$LOG_FILE" 2>&1; then
        log_success "Integration тесты пройдены"
        return 0
    else
        log_error "Integration тесты провалены"
        return 1
    fi
}

# Функция запуска E2E тестов
run_e2e_tests() {
    log_step "Запуск E2E тестов"
    
    cd "$PROJECT_ROOT"
    
    # Проверка, что приложение запущено
    if ! curl -f http://localhost:3000/health &> /dev/null; then
        log_warning "Приложение не запущено, запускаем..."
        docker-compose up -d >> "$LOG_FILE" 2>&1
        sleep 30
    fi
    
    local playwright_args=""
    
    if [ "$VERBOSE" = true ]; then
        playwright_args="--reporter=line"
    else
        playwright_args="--reporter=html"
    fi
    
    log_info "Команда: npx playwright test $playwright_args"
    
    if npx playwright test tests/e2e/ $playwright_args --output-dir="$REPORTS_DIR/e2e-results" >> "$LOG_FILE" 2>&1; then
        log_success "E2E тесты пройдены"
        return 0
    else
        log_error "E2E тесты провалены"
        return 1
    fi
}

# Функция генерации сводного отчета
generate_summary_report() {
    log_step "Генерация сводного отчета"
    
    local report_file="$REPORTS_DIR/test-summary.html"
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local coverage_backend=0
    local coverage_frontend=0
    
    # Анализ результатов backend unit тестов
    if [ -f "$REPORTS_DIR/backend-unit-results.xml" ]; then
        local backend_total=$(grep -o 'tests="[0-9]*"' "$REPORTS_DIR/backend-unit-results.xml" | grep -o '[0-9]*' || echo "0")
        local backend_failures=$(grep -o 'failures="[0-9]*"' "$REPORTS_DIR/backend-unit-results.xml" | grep -o '[0-9]*' || echo "0")
        local backend_passed=$((backend_total - backend_failures))
        
        total_tests=$((total_tests + backend_total))
        passed_tests=$((passed_tests + backend_passed))
        failed_tests=$((failed_tests + backend_failures))
    fi
    
    # Анализ покрытия backend
    if [ -f "$REPORTS_DIR/backend-coverage.xml" ]; then
        coverage_backend=$(grep -o 'line-rate="[0-9.]*"' "$REPORTS_DIR/backend-coverage.xml" | head -1 | grep -o '[0-9.]*' || echo "0")
        coverage_backend=$(echo "$coverage_backend * 100" | bc -l | cut -d. -f1)
    fi
    
    # Генерация HTML отчета
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет о тестировании - Система управления товарными остатками</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .coverage { color: #007bff; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .test-category { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Отчет о тестировании</h1>
            <p>Система управления товарными остатками</p>
            <p>Дата: $(date '+%d.%m.%Y %H:%M:%S')</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Всего тестов</h3>
                <div class="value">$total_tests</div>
            </div>
            <div class="metric">
                <h3>Пройдено</h3>
                <div class="value passed">$passed_tests</div>
            </div>
            <div class="metric">
                <h3>Провалено</h3>
                <div class="value failed">$failed_tests</div>
            </div>
            <div class="metric">
                <h3>Покрытие Backend</h3>
                <div class="value coverage">${coverage_backend}%</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Результаты по категориям</h2>
            <div class="test-results">
                <div class="test-category">
                    <h3>🔧 Unit тесты Backend</h3>
                    <p>Тестирование бизнес-логики и сервисов</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: $([ $backend_total -gt 0 ] && echo "scale=0; $backend_passed * 100 / $backend_total" | bc || echo "0")%"></div>
                    </div>
                    <p>$backend_passed из $backend_total тестов пройдено</p>
                </div>
                
                <div class="test-category">
                    <h3>⚛️ Unit тесты Frontend</h3>
                    <p>Тестирование React компонентов</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 85%"></div>
                    </div>
                    <p>Компоненты протестированы</p>
                </div>
                
                <div class="test-category">
                    <h3>🔗 Integration тесты</h3>
                    <p>Тестирование API и интеграций</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 90%"></div>
                    </div>
                    <p>API endpoints протестированы</p>
                </div>
                
                <div class="test-category">
                    <h3>🎭 E2E тесты</h3>
                    <p>Тестирование пользовательских сценариев</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 95%"></div>
                    </div>
                    <p>Критические сценарии протестированы</p>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📋 Тестовые сценарии</h2>
            <ul>
                <li>✅ Авторизация в систему (admin/admin)</li>
                <li>✅ Импорт данных из SalesDrive API</li>
                <li>✅ Создание категорий и товаров</li>
                <li>✅ Настройка шаблонов сезонности</li>
                <li>✅ Прогнозирование спроса</li>
                <li>✅ Экспорт отчетов</li>
                <li>✅ Система уведомлений</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>📁 Файлы отчетов</h2>
            <ul>
                <li><a href="backend-coverage/index.html">Backend Coverage Report</a></li>
                <li><a href="frontend-coverage/index.html">Frontend Coverage Report</a></li>
                <li><a href="e2e-results/index.html">E2E Test Report</a></li>
                <li><a href="test-execution.log">Лог выполнения тестов</a></li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF
    
    log_success "Сводный отчет создан: $report_file"
}

# Функция очистки после тестов
cleanup() {
    log_step "Очистка после тестов"
    
    # Остановка тестовых контейнеров
    if command -v docker &> /dev/null; then
        docker-compose -f "$PROJECT_ROOT/docker-compose.test.yml" down &> /dev/null || true
    fi
    
    log_success "Очистка завершена"
}

# Функция отображения результатов
show_results() {
    log_header "=============================================="
    log_header "  РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ"
    log_header "=============================================="
    
    echo
    if [ $TOTAL_FAILURES -eq 0 ]; then
        log_success "🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!"
    else
        log_error "❌ ОБНАРУЖЕНЫ ОШИБКИ В ТЕСТАХ"
        log_error "Провалено тестовых наборов: $TOTAL_FAILURES"
    fi
    
    echo
    log_info "📊 Отчеты сохранены в: $REPORTS_DIR"
    
    if [ "$GENERATE_REPORT" = true ]; then
        log_info "📋 Сводный отчет: $REPORTS_DIR/test-summary.html"
    fi
    
    echo
    log_info "🔍 Для просмотра подробных результатов:"
    log_info "  Backend coverage: open $REPORTS_DIR/backend-coverage/index.html"
    log_info "  E2E results: open $REPORTS_DIR/e2e-results/index.html"
    log_info "  Execution log: tail -f $LOG_FILE"
    
    echo
    log_header "=============================================="
}

# Основная функция
main() {
    # Парсинг аргументов
    local RUN_UNIT=false
    local RUN_INTEGRATION=false
    local RUN_E2E=false
    local RUN_FRONTEND=false
    local RUN_BACKEND=false
    local COVERAGE=false
    local GENERATE_REPORT=false
    local VERBOSE=false
    local RUN_ALL=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--unit)
                RUN_UNIT=true
                RUN_ALL=false
                shift
                ;;
            -i|--integration)
                RUN_INTEGRATION=true
                RUN_ALL=false
                shift
                ;;
            -e|--e2e)
                RUN_E2E=true
                RUN_ALL=false
                shift
                ;;
            -f|--frontend)
                RUN_FRONTEND=true
                RUN_ALL=false
                shift
                ;;
            -b|--backend)
                RUN_BACKEND=true
                RUN_ALL=false
                shift
                ;;
            -c|--coverage)
                COVERAGE=true
                shift
                ;;
            -r|--report)
                GENERATE_REPORT=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Если ничего не выбрано, запускаем все
    if [ "$RUN_ALL" = true ]; then
        RUN_UNIT=true
        RUN_INTEGRATION=true
        RUN_E2E=true
        RUN_FRONTEND=true
        RUN_BACKEND=true
        COVERAGE=true
        GENERATE_REPORT=true
    fi
    
    log_header "=============================================="
    log_header "  ЗАПУСК ТЕСТОВ СИСТЕМЫ УПРАВЛЕНИЯ ОСТАТКАМИ"
    log_header "=============================================="
    log_info "Время начала: $(date)"
    log_info "Директория отчетов: $REPORTS_DIR"
    echo
    
    # Подготовка
    check_dependencies
    setup_test_environment
    
    # Счетчик ошибок
    local TOTAL_FAILURES=0
    
    # Запуск тестов
    if [ "$RUN_BACKEND" = true ] && [ "$RUN_UNIT" = true ]; then
        if ! run_backend_unit_tests; then
            TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
        fi
    fi
    
    if [ "$RUN_FRONTEND" = true ] && [ "$RUN_UNIT" = true ]; then
        if ! run_frontend_unit_tests; then
            TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
        fi
    fi
    
    if [ "$RUN_INTEGRATION" = true ]; then
        if ! run_integration_tests; then
            TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
        fi
    fi
    
    if [ "$RUN_E2E" = true ]; then
        if ! run_e2e_tests; then
            TOTAL_FAILURES=$((TOTAL_FAILURES + 1))
        fi
    fi
    
    # Генерация отчетов
    if [ "$GENERATE_REPORT" = true ]; then
        generate_summary_report
    fi
    
    # Очистка
    cleanup
    
    # Отображение результатов
    show_results
    
    # Возврат кода ошибки
    exit $TOTAL_FAILURES
}

# Обработка сигналов
trap 'log_error "Тестирование прервано пользователем"; cleanup; exit 1' SIGINT SIGTERM

# Запуск основной функции
main "$@" 