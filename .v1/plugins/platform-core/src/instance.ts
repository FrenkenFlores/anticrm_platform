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

import { Platform, Resource, Doc, Ref, Class, Obj, Emb, attributeKey } from '@anticrm/platform'
import { MemDb, Layout } from '@anticrm/memdb'

import { Instance, Type, Session } from '.'

export interface Prototypes {
  instantiateEmb<T extends Emb> (obj: Layout<Obj>): Promise<Instance<T>>
  instantiateDoc<T extends Doc> (obj: Layout<Doc>): Promise<Instance<T>>
  as<T extends Doc, A extends Doc> (obj: Instance<T>, _class: Ref<Class<A>>): Promise<Instance<A>>
  is<T extends Doc, A extends Doc> (obj: Instance<T>, _class: Ref<Class<A>>): boolean
  // debug?
  getPrototype<T extends Obj> (_class: Ref<Class<T>>, stereotype: number /* for tests */): Promise<Object>
}

export function createPrototypes (platform: Platform, modelDb: MemDb, CoreRoot: Object, docUpdated: (doc: Instance<Doc>) => void): Prototypes {

  type Konstructor<T extends Obj> = new (obj: Layout<Obj>) => Instance<T>

  enum Stereotype {
    EMB,
    DOC
  }

  // M O D E L

  const konstructors = new Map<Ref<Class<Obj>>, Konstructor<Obj>>()
  const prototypes = new Map<Ref<Class<Obj>>, Object>()

  async function getPrototype<T extends Obj> (_class: Ref<Class<T>>, stereotype: Stereotype): Promise<Object> {
    const prototype = prototypes.get(_class)
    if (prototype) { return prototype }

    const clazz = modelDb.get(_class) as Layout<Class<Doc>>
    const parent = clazz._extends ? await getPrototype(clazz._extends as string as Ref<Class<Obj>>, stereotype) : CoreRoot
    const proto = Object.create(parent)
    prototypes.set(_class, proto)

    if (clazz._native) {
      const native = await platform.getResource(clazz._native as unknown as Resource<Object>) // TODO: must `resolve`! we need to have getPrototype async for this.
      if (!native) { throw new Error(`something went wrong, can't load '${clazz._native}' resource`) }
      const descriptors = Object.getOwnPropertyDescriptors(native)
      Object.defineProperties(proto, descriptors)
      // prototypes.set(_class, proto)
      return proto
    }

    const attributes = clazz._attributes
    for (const key in attributes) {
      if (key === '_default') { continue } // we do not define `_default`'s type, it's infinitevely recursive :)
      const attr = attributes[key]
      // console.log(attr)
      const attrInstance = await instantiateEmb(attr) as Instance<Type<any>>
      // console.log(attrInstance)

      // if (typeof attrInstance.exert !== 'function') {
      //   throw new Error('exert is not a function')
      // }

      const exertFactory = attrInstance.exert

      if (typeof exertFactory !== 'function') {
        throw new Error('exertFactory is not a function ' + attrInstance._class)
      }

      const exert = await exertFactory.call(attrInstance)
      if (typeof exert !== 'function') {
        throw new Error('exert is not a function')
      }

      const hibernate = attrInstance.hibernate
      if (typeof hibernate !== 'function') {
        throw new Error('hibernate is not a function')
      }
      const hibernateBound = hibernate.bind(attrInstance)

      const fullKey = stereotype === Stereotype.DOC ?
        key.startsWith('_') ? key : attributeKey(_class, key) :
        key

      Object.defineProperty(proto, key, {
        get (this: Instance<Obj>) {
          let value = (this.__update as any)[fullKey]
          if (!value) {
            value = (this.__layout as any)[fullKey]
          }
          return exert(value, this.__layout, key)
        },
        set (this: Instance<Obj>, value: any) {
          (this.__update as any)[fullKey] = hibernateBound(value)
          const id = (this.__layout as Layout<Doc>)._id
          if (id) { docUpdated(this as Instance<Doc>) }
        },
        enumerable: true
      })
    }
    return proto
  }

  async function getKonstructor<T extends Obj> (_class: Ref<Class<T>>, stereotype: Stereotype): Promise<Konstructor<T>> {
    const konstructor = konstructors.get(_class)
    if (konstructor) { return konstructor as unknown as Konstructor<T> }
    else {
      const proto = await getPrototype(_class, stereotype)
      const ctor = {
        [_class]: function (this: Instance<Obj>, obj: Layout<Doc>) {
          this.__layout = obj
          this.__update = {} as Layout<Doc>
        }
      }[_class] // A trick to `name` function as `_class` value
      proto.constructor = ctor
      ctor.prototype = proto
      konstructors.set(_class, ctor as unknown as Konstructor<Obj>)
      return ctor as unknown as Konstructor<T>
    }
  }

  async function instantiateEmb<T extends Emb> (obj: Layout<Obj>): Promise<Instance<T>> {
    const ctor = await getKonstructor(obj._class, Stereotype.EMB)
    return new ctor(obj) as Instance<T>
  }

  async function instantiateDoc<T extends Doc> (obj: Layout<Doc>): Promise<Instance<T>> {
    const ctor = await getKonstructor(obj._class, Stereotype.DOC)
    return new ctor(obj) as unknown as Instance<T>
  }

  async function as<T extends Doc, A extends Doc> (doc: Instance<T>, _class: Ref<Class<A>>): Promise<Instance<A>> {
    if (!is(doc, _class)) {
      console.log('Warning:' + _class + ' instance does not mixed into `' + doc._class + '`')
    }
    const ctor = await getKonstructor(_class, Stereotype.DOC)
    return new ctor(doc.__layout as unknown as A)
  }

  function is<T extends Doc, M extends Doc> (doc: Instance<T>, _class: Ref<Class<M>>): boolean {
    const mixins = doc._mixins as Ref<Class<Doc>>[]
    return mixins && mixins.includes(_class as Ref<Class<Doc>>)
  }

  const service: Prototypes = {
    instantiateEmb,
    instantiateDoc,
    as,
    is,
    getPrototype
  }

  return service
}