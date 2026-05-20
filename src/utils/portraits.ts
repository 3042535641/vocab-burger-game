const portraitIds = new Set(['round', 'star', 'cap', 'bow', 'shade', 'bun', 'boss'])

export const getPortraitHref = (avatar?: string, isBoss = false) => {
  const id = isBoss ? 'boss' : portraitIds.has(avatar ?? '') ? avatar : 'round'
  return `${import.meta.env.BASE_URL}art/portraits.svg#portrait-${id}`
}
