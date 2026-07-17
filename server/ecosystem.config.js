module.exports = {
  apps: [{
    name: 'inventory-server',
    script: 'src/index.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 'max',       
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}