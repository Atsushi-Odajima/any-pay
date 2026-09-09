#!/usr/bin/env bash
# =============================================================================
# SQL テストランナー
#   DATABASE_URL が設定されていればその DB を使う（空のDBを想定。例: supabase start の DB）。
#   未設定なら一時的な PostgreSQL クラスタを起動して実行し、終了後に破棄する。
#   使い方: npm run test:sql            # 全テスト
#           bash tests/sql/run.sh phase2 # ファイル名に phase2 を含むテストのみ
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILTER="${1:-}"
cd "$ROOT"

PSQL_ARGS=(-v ON_ERROR_STOP=1 -q -X)

cleanup() {
  if [ -n "${PG_TMP:-}" ]; then
    run_pg pg_ctl -D "$PG_TMP/data" stop -m immediate -s >/dev/null 2>&1 || true
    rm -rf "$PG_TMP"
  fi
}
trap cleanup EXIT

if [ -z "${DATABASE_URL:-}" ]; then
  PGBIN="${PGBIN:-}"
  if [ -z "$PGBIN" ]; then
    if command -v pg_config >/dev/null 2>&1; then
      PGBIN="$(pg_config --bindir)"
    else
      PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
    fi
  fi
  if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
    echo "PostgreSQL が見つかりません。DATABASE_URL を設定するか PostgreSQL をインストールしてください" >&2
    exit 1
  fi

  PG_TMP="$(mktemp -d "${TMPDIR:-/tmp}/anypay-pg.XXXXXX")"
  # root の場合は postgres ユーザーで動かす（initdb は root 実行を拒否する）
  if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
    chown postgres "$PG_TMP"
    run_pg() { su -s /bin/bash postgres -c "$(printf '%q ' "$PGBIN/$1" "${@:2}")"; }
  else
    run_pg() { "$PGBIN/$1" "${@:2}"; }
  fi

  run_pg initdb -D "$PG_TMP/data" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
  run_pg pg_ctl -D "$PG_TMP/data" -o "-k $PG_TMP -h '' -c fsync=off -c synchronous_commit=off -c wal_level=logical" -l "$PG_TMP/pg.log" -w start -s
  export PGHOST="$PG_TMP" PGUSER=postgres PGDATABASE=postgres
  psql "${PSQL_ARGS[@]}" -c 'create database anypay_test' >/dev/null
  export PGDATABASE=anypay_test
  DB=()
else
  DB=("$DATABASE_URL")
fi

echo "== shim"
psql "${PSQL_ARGS[@]}" "${DB[@]}" -f tests/sql/_shim.sql

echo "== migrations"
for f in supabase/migrations/*.sql; do
  echo "   $f"
  psql "${PSQL_ARGS[@]}" "${DB[@]}" -f "$f"
done

echo "== tests"
FAILED=0
for f in tests/sql/*.test.sql; do
  if [ -n "$FILTER" ] && [[ "$f" != *"$FILTER"* ]]; then continue; fi
  echo "-- $f"
  # 結果セットは捨て、NOTICE（ok - ...）とエラーだけ表示する
  psql "${PSQL_ARGS[@]}" "${DB[@]}" -f "$f" 2>&1 >/dev/null | sed 's/^psql:.*NOTICE:  /   /; s/^NOTICE:  /   /'
  if [ "${PIPESTATUS[0]}" -ne 0 ]; then
    FAILED=1
    echo "   FAILED: $f"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo "SQL tests failed"
  exit 1
fi
echo "SQL tests passed"
