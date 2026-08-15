#!/bin/bash
# =============================================
# Script para iniciar/parar o servidor do projeto
# Uso: ./serve.sh [start|stop|status|restart]
# =============================================

PROJECT_DIR="5etools-src-translation-main"
PORT=5000
PID_FILE="/tmp/5etools-server.pid"
LOG_FILE="/tmp/5etools-server.log"

cd "$(dirname "$0")"

start_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "⚠️  Servidor já está rodando (PID: $(cat "$PID_FILE"))"
        return 1
    fi

    echo "🚀 Iniciando servidor em http://localhost:$PORT ..."
    cd "$PROJECT_DIR"
    # --bind 127.0.0.1 mantém o servidor restrito à máquina local (evita
    # exposição na rede/LAN). O http.server do Python abre em 0.0.0.0 por padrão.
    nohup python3 -m http.server "$PORT" --bind 127.0.0.1 > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Servidor iniciado! Acesse: http://localhost:$PORT"
        echo "   Ou abra diretamente: http://localhost:$PORT/statgen.html"
        echo "   Log: $LOG_FILE (PID: $(cat "$PID_FILE"))"
    else
        echo "❌ Falha ao iniciar servidor. Verifique o log: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  Servidor não está rodando (PID file não encontrado)"
        # Tenta matar por processo
        pkill -f "http.server $PORT" 2>/dev/null && echo "✅ Servidor parado." || echo "Nenhum servidor encontrado na porta $PORT."
        return 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        sleep 1
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "✅ Servidor parado com sucesso."
        else
            echo "⚠️  Forçando parada do servidor..."
            kill -9 "$PID"
            echo "✅ Servidor parado (forçado)."
        fi
    else
        echo "⚠️  Processo $PID não existe mais. Servidor já estava parado."
    fi
    rm -f "$PID_FILE"
}

server_status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Servidor está RODANDO"
        echo "   URL: http://localhost:$PORT"
        echo "   PID: $(cat "$PID_FILE")"
        echo "   Log: $LOG_FILE"
    else
        # Verifica se há algo escutando na porta
        if ss -tln | grep -q ":$PORT "; then
            echo "✅ Servidor na porta $PORT está RODANDO (mas sem PID file)"
        else
            echo "❌ Servidor NÃO está rodando"
        fi
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    status)
        server_status
        ;;
    restart)
        stop_server
        start_server
        ;;
    *)
        echo "Uso: $0 {start|stop|status|restart}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia o servidor"
        echo "  stop    - Para o servidor"
        echo "  status  - Verifica estado do servidor"
        echo "  restart - Reinicia o servidor"
        exit 1
        ;;
esac