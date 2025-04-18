// Admin configuration
module.exports = {
  // Admin credentials (in a real production app, use environment variables and proper hashing)
  username: 'admin',
  password: 'gameadmin',
  
  // Admin session settings
  sessionSecret: 'grav-admin-secret',
  sessionMaxAge: 24 * 60 * 60 * 1000 // 24 hours
};
