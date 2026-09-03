type LocalAiNavigator = Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>

export function isMobileOrTabletDevice(device: LocalAiNavigator) {
  return /Android|iPad|iPhone|iPod|Kindle|Mobile|PlayBook|Silk|Tablet/i.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
}
