import App from './App.vue'
import '@varlet/touch-emulator'
// @ts-ignore
import routes from '@pc-routes'
// @ts-ignore
import config from '@config'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { get } from 'lodash'
import { useProgress } from '../useProgress'

const redirect = get(config, 'pc.redirect')
redirect &&
  routes.push({
    path: '/:pathMatch(.*)*',
    redirect,
  })

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

let isEnd = true
const { start, end } = useProgress()

router.beforeEach(() => {
  isEnd = false
  setTimeout(() => {
    if (!isEnd) start()
  }, 200)
})

router.afterEach(() => {
  isEnd = true
  end()
})

window.top['router'] = router

const app = createApp(App)

app.use(router).mount('#app')
