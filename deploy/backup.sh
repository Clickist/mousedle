#!/usr/bin/env bash
# PostgreSQL 每日备份:导出到 backups/ 目录并按份数滚动清理。
#
# 使用方法(与 update.sh 一样放在 compose.yaml 旁边):
#   sudo chmod 700 backup.sh
#   sudo ./backup.sh                       # 手动跑一次验证
#
# 加入 crontab 每天凌晨 4 点自动备份(crontab -e):
#   0 4 * * * /opt/csgofriberg/backup.sh >> /opt/csgofriberg/backups/backup.log 2>&1
#
# 注意:备份留在同一块磁盘上只能防误删,防不了磁盘损坏。
# 建议再用 rclone/rsync 把 backups/ 同步到另一台机器或对象存储,例如:
#   rclone copy /opt/csgofriberg/backups remote:mousedle-backups --max-age 48h
#
# 可调参数(环境变量):
#   BACKUP_KEEP  保留最近几份,默认 14

set -Eeuo pipefail

readonly BACKUP_KEEP="${BACKUP_KEEP:-14}"

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${SCRIPT_DIR}/compose.yaml" ]]; then
  readonly DEPLOY_DIR="${SCRIPT_DIR}"
elif [[ -f "${SCRIPT_DIR}/../compose.yaml" ]]; then
  readonly DEPLOY_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
else
  echo "错误:本脚本需要与 compose.yaml 放在同一目录或其子目录。" >&2
  exit 1
fi

# 从 .env 读取数据库账号密码,与 compose 实际使用的值保持一致
if [[ -f "${DEPLOY_DIR}/.env" ]]; then
  # shellcheck disable=SC1091
  source "${DEPLOY_DIR}/.env"
fi

readonly POSTGRES_USER="${POSTGRES_USER:-csgofriberg}"
readonly POSTGRES_DB="${POSTGRES_DB:-csgofriberg}"
readonly BACKUP_DIR="${DEPLOY_DIR}/backups"

log() {
  printf '[%(%Y-%m-%d %H:%M:%S)T] %s\n' -1 "$*"
}

fail() {
  log "错误:$*" >&2
  exit 1
}

compose() {
  docker compose --project-directory "${DEPLOY_DIR}" -f "${DEPLOY_DIR}/compose.yaml" "$@"
}

command -v docker >/dev/null 2>&1 || fail "docker 未安装或不在 PATH 中。"

case "${BACKUP_KEEP}" in
  ''|*[!0-9]*) fail "BACKUP_KEEP 必须是正整数。" ;;
esac
(( BACKUP_KEEP > 0 )) || fail "BACKUP_KEEP 必须大于零。"

mkdir -p "${BACKUP_DIR}"

readonly STAMP="$(date +%Y%m%d-%H%M%S)"
readonly TARGET="${BACKUP_DIR}/mousedle-${STAMP}.dump"
readonly PARTIAL="${TARGET}.partial"

log "正在导出 PostgreSQL(${POSTGRES_USER}@${POSTGRES_DB})..."
# 先写 .partial 文件,确认非空后再改名,保证 backups/ 里不会留下看似完整的半截文件
compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc > "${PARTIAL}"

[[ -s "${PARTIAL}" ]] || { rm -f "${PARTIAL}"; fail "导出结果为空,已放弃。"; }
mv "${PARTIAL}" "${TARGET}"
log "导出完成:${TARGET}"

# 按修改时间保留最近 BACKUP_KEEP 份,其余删除
while IFS= read -r old; do
  rm -- "${old}"
  log "已清理过期备份:${old}"
done < <(ls -1t "${BACKUP_DIR}"/mousedle-*.dump 2>/dev/null | tail -n +"$((BACKUP_KEEP + 1))")

log "备份完成,当前共 $(ls -1 "${BACKUP_DIR}"/mousedle-*.dump 2>/dev/null | wc -l) 份。"
