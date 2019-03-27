require('handjs')
import $Carousel from './packages/Carousel/index'
import $ContextMenu from './packages/ContextMenu/index'
import $Pdf from './packages/Pdf/index'

const install = function (Vue) {
  Vue.component($Carousel.name, $Carousel)
  Vue.component($Pdf.name, $Pdf)

  Vue.prototype.$contextmenu = $ContextMenu.show
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export const Carousel = $Carousel
export const ContextMenu = $ContextMenu
export const Pdf = $Pdf

export default install
