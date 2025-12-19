import { store } from 'quasar/wrappers';
import { createPinia, Pinia } from 'pinia';

let piniaInstance: Pinia | null = null;

export const getPinia = () => {
	if (!piniaInstance) {
		piniaInstance = createPinia();
	}

	return piniaInstance;
};

export default store(() => {
	return getPinia();
});
