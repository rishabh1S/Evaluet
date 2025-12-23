export const cardStyle = {
  bg: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  borderRadius: '$6',
  p: '$5',
  shadowColor: '#000',
  shadowOpacity: 0.35,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
} as const

export const inputStyle = {
  bg: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.18)',
  color: 'white',
  height: 52,
  focusStyle: {
    borderColor: '#3B82F6',
    bg: 'rgba(255,255,255,0.08)',
  },
} as const
