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

import { IntlMessageFormat, PrimitiveType } from 'intl-messageformat'
import { Platform } from '@anticrm/platform'
import { Doc, Instance, Type, Ref, Exert, Property } from '@anticrm/platform-core'
import i18n, { I18nService, IntlString } from '..'

/**
 * Construct `IntlString` id for an object's attribute.
 *
 * @param _id
 * @param key
 */
export function synthIntlString (_id: Ref<Doc>, key: string): IntlString {
  const index = _id.indexOf(':')
  const keyIndex = key.indexOf('/')
  if (keyIndex !== -1) {
    key = key.substring(keyIndex + 1)
  }
  return 'string:' + _id.substring(index + 1) + '/' + key as IntlString
}

console.log('PLUGIN: parsed i18n')
/*!
  * Anticrm Platform™ Core Internationalization Plugin
  * Copyright © 2020 Anticrm Platform Contributors. All Rights Reserved.
  * Licensed under the Eclipse Public License, Version 2.0
  */
export default async (platform: Platform): Promise<I18nService> => {
  console.log('PLUGIN: started i18n')

  const strings: Map<IntlString, string> = new Map()
  const imfCache: Map<IntlString, IntlMessageFormat> = new Map()

  function loadStrings (translations: { [key: string]: string }) {
    for (const key in translations) {
      strings.set(key as IntlString, translations[key])
    }
  }

  function translate (string: IntlString, params?: Record<string, PrimitiveType> | undefined): string {
    const translation = strings.get(string)
    if (!translation) {
      return string
    }
    if (params) {
      let imf = imfCache.get(string)
      if (!imf) {
        imf = new IntlMessageFormat(translation, 'ru-RU')
        imfCache.set(string, imf)
      }
      return imf.format(params) as string
    }
    return translation
  }

  const IntlString_exert = async function (this: Instance<Type<Doc>>): Promise<Exert<any>> { // eslint-disable-line
    return ((value: IntlString & Property<string>, layout: any, key: string) => {
      const translation = translate(value)
      if (translation !== value) {
        return translation
      } else {
        if (layout._id) {
          const id = synthIntlString(layout._id as Ref<Doc>, key)
          const translation = translate(id)
          if (translation !== id) { return translation }
        }
        return value
      }
    }) as Exert<any>
  }

  const boot = platform.getMetadata(i18n.metadata.BootStrings)
  if (boot) { loadStrings(boot) }

  platform.setResource(i18n.method.IntlString_exert, IntlString_exert)

  return {
    translate,
    loadStrings
  }
}
