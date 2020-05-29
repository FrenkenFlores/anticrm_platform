//
// Copyright © 2020 Anticrm Platform Contributors.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Platform } from '@anticrm/platform'

import core from '@anticrm/platform-core'
import i18n from '@anticrm/platform-core-i18n'
import ui from '@anticrm/platform-ui'
import workbench from '@anticrm/platform-workbench'
import contact from '@anticrm/contact'
import demo from '@anticrm/demo-3d'

import { createApp } from 'vue'
import ErrorPage from './components/ErrorPage.vue'

// import uiMeta from '@anticrm/platform-ui-model/src/__resources__/meta'
// import contactMeta from '@anticrm/contact/src/__resources__/meta'

import Builder from '@anticrm/platform-core/src/__model__/builder'

import coreModel from '@anticrm/platform-core/src/__model__/model'
import i18nModel from '@anticrm/platform-core-i18n/src/__model__/model'
import uiModel from '@anticrm/platform-ui/src/__model__/model'
import contactModel from '@anticrm/contact/src/__model__/model'

const platform = new Platform()
platform.setMetadata(ui.metadata.DefaultApplication, workbench.component.Workbench)
// platform.setMetadata(ui.metadata.DefaultApplication, demo.component.Periodic)

platform.addLocation(core, () => import(/* webpackChunkName: "platform-core" */ '@anticrm/platform-core/src/plugin'))
platform.addLocation(i18n, () => import(/* webpackChunkName: "platform-core-i18n" */ '@anticrm/platform-core-i18n/src/plugin'))
platform.addLocation(ui, () => import(/* webpackChunkName: "platform-ui" */ '@anticrm/platform-ui/src/plugin'))
platform.addLocation(workbench, () => import(/* webpackChunkName: "platform-workbench" */ '@anticrm/platform-workbench/src/plugin'))
platform.addLocation(contact, () => import(/* webpackChunkName: "contact" */ '@anticrm/contact/src/plugin'))
platform.addLocation(demo, () => import(/* webpackChunkName: "demo-3d" */ '@anticrm/demo-3d/src/plugin'))

// uiMeta(platform)
// contactMeta(platform)

async function boot (): Promise<void> {
  const corePlugin = await platform.getPlugin(core.id)
  const i18nService = await platform.getPlugin(i18n.id) // TODO: dirty hack, resources does not resolve awhen building prototypes.
  const builder = new Builder(corePlugin.getDb())
  builder.load(coreModel)
  builder.load(i18nModel)
  builder.load(uiModel)
  builder.load(contactModel)

  const uiPlugin = await platform.getPlugin(ui.id)
  uiPlugin.getApp().mount('#app')
}

boot().catch(err => {
  createApp(ErrorPage).mount('#app')
})