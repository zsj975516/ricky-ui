import Carousel from './src/Carousel.vue';

Carousel.install = function (Vue) {
  Vue.component(Carousel.name, Carousel);
};

export default Carousel;
