/** Extraído do <script> inline de index.html. */
module.exports = {
  content: ['../index.html', '../assets/js/andy.js'],
    theme: {
      extend: {
        fontFamily: {
          sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
          display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
          serif:   ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
          mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        },
        colors: {
          ink:        '#0B0B0C',
          graphite:   '#55525A',
          mist:       '#8E8A91',
          hairline:   '#E7E5E8',
          pearl:      '#F7F6F5',
          po:         '#EAD7D1',
          champagne:  '#B89A7E',
          'champagne-deep': '#86684F',
          success:    '#3E7B62',
          warning:    '#9C6B34',
          error:      '#A64242',
        },
      }
    }
  }
