module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not ie <= 11',
        'not dead',
        'Chrome >= 87',
        'Firefox >= 78', 
        'Safari >= 14',
        'Edge >= 88',
        'Opera >= 73',
        'iOS >= 14',
        'Android >= 87'
      ]
    },
  },
}