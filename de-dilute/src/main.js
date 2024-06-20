import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { library } from '@fortawesome/fontawesome-svg-core' /* import the fontawesome core */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome' /* import font awesome icon component */
import { faFacebookF, faInstagram, faTiktok } from '@fortawesome/free-brands-svg-icons' /* import specific icons */
/* add icons to the library */
library.add(
    faFacebookF,
    faInstagram,
    faTiktok
)



const app = createApp(App)
.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)

app.mount('#app')
