import $Carousel from './packages/Carousel/index'

const install = function (Vue) {
    Vue.component($Carousel.name, $Carousel)
}

if (typeof window !== 'undefined' && window.Vue) {
    install(window.Vue)
}

export const Carousel = $Carousel

export default install
