# Stub of nvm-sh used by the integration tests. It is sourced by the unix
# adapter (NVM_DIR points here) and only prints canned output.
nvm() {
  case "$1" in
    ls | list)
      printf '%s\n' \
        '-> v22.16.0' \
        '   v20.11.0' \
        '   v18.20.4'
      ;;
    current)
      echo 'v22.16.0'
      ;;
    ls-remote | list-remote)
      printf '%s\n' \
        'v24.13.1' \
        'v22.16.0' \
        'v20.11.0 (LTS: Iron)' \
        'v18.20.4 (LTS: Hydrogen)'
      ;;
    version | --version)
      echo '0.39.7'
      ;;
    use | install)
      echo "Now using node v$2"
      ;;
    uninstall)
      echo "Uninstalled node v$2"
      ;;
    root)
      echo "${NVM_DIR:-/tmp/nvm}"
      ;;
    *)
      echo "nvm stub: unsupported command: $*" >&2
      return 1
      ;;
  esac
}
