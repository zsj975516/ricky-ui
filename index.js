import $Carousel from './packages/Carousel/index'
import $ContextMenu from './packages/ContextMenu/index'

const install = function (Vue) {
  Vue.component($Carousel.name, $Carousel)

  Vue.prototype.$contextmenu = $ContextMenu.show
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export const Carousel = $Carousel
export const ContextMenu = $ContextMenu

export default install
