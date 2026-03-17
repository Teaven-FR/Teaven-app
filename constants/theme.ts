// Design tokens Teaven — système de design unifié

export const colors = {
  bg: '#F2F1EA',
  surface: '#FFFFFF',
  green: '#6B8F71',
  greenDark: '#4A6B50',
  greenLight: '#E8F0EA',
  text: '#2A2A2A',
  textSecondary: '#8A8A82',
  textMuted: '#B0AFA8',
  border: '#E8E7E2',
  error: '#D4544A',
} as const;

export const fonts = {
  thin: 'BwModelica-Thin',
  regular: 'BwModelica-Regular',
  bold: 'BwModelica-Bold',
  mono: 'JetBrains Mono',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 50,
  card: 20,
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loyalty: {
    shadowColor: '#3A5A40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const typography = {
  // Titres
  h1: { fontFamily: 'BwModelica-Bold', fontSize: 26, letterSpacing: -0.5, color: '#2A2A2A' },
  h2: { fontFamily: 'BwModelica-Bold', fontSize: 22, letterSpacing: -0.3, color: '#2A2A2A' },
  h3: { fontFamily: 'BwModelica-Bold', fontSize: 17, letterSpacing: -0.2, color: '#2A2A2A' },

  // Corps
  body: { fontFamily: 'BwModelica-Regular', fontSize: 14, lineHeight: 22, color: '#2A2A2A' },
  bodySmall: { fontFamily: 'BwModelica-Regular', fontSize: 13, color: '#8A8A82' },

  // Labels
  label: {
    fontFamily: 'BwModelica-Bold',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    color: '#B0AFA8',
  },

  // Prix
  price: { fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: '600' as const, color: '#6B8F71' },
  priceLarge: { fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: '700' as const, color: '#2A2A2A' },

  // Pills
  pill: { fontFamily: 'BwModelica-Regular', fontSize: 12.5, letterSpacing: 0.3 },

  // Navigation
  navLabel: { fontFamily: 'BwModelica-Regular', fontSize: 9.5, letterSpacing: 0.5 },
} as const;
