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

import { attributeKey, Ref, Class, Obj, Doc, Property, Emb } from '@anticrm/platform'
import { generateId } from './objectid'

interface Z<T extends Obj> extends Class<T> {
  x: Property<string>
  y?: Property<Date>
  z?: { [key: string]: Emb }
}

export type LayoutType = string | number | Emb | { [key: string]: LayoutType } | LayoutType[] | undefined
export type AnyLayout = { [key: string]: LayoutType }

export interface ObjLayout {
  [key: string]: LayoutType
  _class: Ref<Class<Doc>>
}

export interface DocLayout extends ObjLayout {
  _id: Ref<Doc>
  _mixins?: Ref<Class<Doc>>[]
}

type ToLayout<T> =
  T extends Ref<Doc> | undefined ? T :
  T extends Property<any> | undefined ? LayoutType :
  T extends { __embedded: true } ? T :
  Layout<T>

export type Layout<T> = { [P in keyof T]:
  T[P] extends Ref<Doc> | undefined ? T[P] :
  T[P] extends Property<infer X> | undefined ? LayoutType :
  T[P] extends (infer X)[] | undefined ? ToLayout<X>[] :
  T[P] extends { [key: string]: infer X } | undefined ? { [key: string]: ToLayout<X> } :
  never
}

export interface CommitInfo {
  created: Layout<Doc>[]
}

export interface DbProtocol {
  find (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<Layout<Doc>[]>
  delete (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<void>
  load (): Promise<Layout<Doc>[]> // TODO: must be load domain
  commit (commitInfo: CommitInfo): Promise<void>
}

export interface ModelDb {
  add (doc: Layout<Doc>): void
  get (id: Ref<Doc>): Layout<Doc>
  dump (): Layout<Doc>[]

  find (clazz: Ref<Class<Doc>>, query: AnyLayout): Promise<Layout<Doc>[]>
  mixin<T extends E, E extends Doc> (id: Ref<E>, clazz: Ref<Class<T>>, values: Layout<Omit<T, keyof E>>): void
  createDocument<M extends Doc> (_class: Ref<Class<M>>, values: Layout<Omit<M, keyof Doc>>, _id?: Ref<M>): Layout<Doc>
}

export const ClassClass = 'class:core.Class' as Ref<Class<Class<Obj>>>

export class MemDb implements ModelDb {
  private objects = new Map<Ref<Doc>, Layout<Doc>>()
  private byClass: Map<Ref<Class<Doc>>, Layout<Doc>[]> | null = null

  objectsOfClass (_class: Ref<Class<Doc>>): Layout<Doc>[] {
    if (!this.byClass) {
      console.log('indexing database...')
      this.byClass = new Map<Ref<Class<Doc>>, Layout<Doc>[]>()
      for (const doc of this.objects.values()) {
        this.index(doc)
      }
    }
    return this.byClass.get(_class) ?? []
  }

  set (doc: Layout<Doc>) {
    const id = doc._id
    if (this.objects.get(id)) { throw new Error('document added already ' + id) }
    this.objects.set(id, doc)
  }

  index (doc: Layout<Doc>) {
    if (this.byClass === null) { throw new Error('index not created') }
    const byClass = this.byClass
    const hierarchy = this.getClassHierarchy(doc._class)
    hierarchy.forEach((_class) => {
      const cls = _class as Ref<Class<Doc>>
      const list = byClass.get(cls)
      if (list) { list.push(doc) } else { byClass.set(cls, [doc]) }
    })
  }

  add (doc: Layout<Doc>) {
    this.set(doc)
    if (this.byClass) this.index(doc)
  }

  get (id: Ref<Doc>): Layout<Doc> {
    const obj = this.objects.get(id)
    if (!obj) { throw new Error('document not found ' + id) }
    return obj
  }

  // D O M A I N

  getDomain (id: Ref<Class<Doc>>): string {
    let clazz = this.objects.get(id) as Layout<Class<Doc>> | undefined
    while (clazz) {
      if (clazz._domain) return clazz._domain as string
      clazz = clazz._extends ? this.objects.get(clazz._extends) as Layout<Class<Doc>> : undefined
    }
    throw new Error('no domain found for class: ' + id)
  }

  /// A S S I G N

  private findAttributeKey<T extends Layout<Doc>> (cls: Ref<Class<Obj>>, key: string): string {
    // TODO: use memdb class hierarchy
    let _class = cls as Ref<Class<Obj>> | undefined
    while (_class) {
      const clazz = this.get(_class) as Layout<Class<Obj>>
      if ((clazz._attributes as any)[key] !== undefined) {
        return attributeKey(_class, key)
      }
      _class = clazz._extends
    }
    throw new Error('attribute not found: ' + key)
  }

  // from Builder
  assign (layout: AnyLayout, _class: Ref<Class<Doc>>, values: AnyLayout) {
    const l = layout as unknown as AnyLayout
    const r = values as unknown as AnyLayout
    for (const key in values) {
      if (key.startsWith('_')) {
        l[key] = r[key]
      } else {
        l[this.findAttributeKey(_class, key)] = r[key]
      }
    }
  }

  generateId (): Ref<Doc> {
    return generateId() as Ref<Doc>
  }

  createDocument<M extends Doc> (_class: Ref<Class<M>>, values: Layout<Omit<M, keyof Doc>>, _id?: Ref<M>): Layout<Doc> {
    const layout = { _class, _id: _id ?? this.generateId() } as Layout<Doc>
    this.assign(layout, _class, values)
    this.add(layout)
    return layout
  }

  mixin<T extends E, E extends Doc> (id: Ref<E>, clazz: Ref<Class<T>>, values: Layout<Omit<T, keyof E>>): void {
    const doc = this.get(id)
    if (!doc._mixins) { doc._mixins = [] }
    doc._mixins.push(clazz)
    this.assign(doc, clazz, values)
  }

  getClassHierarchy (cls: Ref<Class<Doc>>): Ref<Class<Obj>>[] {
    const result = [] as Ref<Class<Obj>>[]
    let _class = cls as Ref<Class<Obj>> | undefined
    while (_class) {
      result.push(_class)
      _class = (this.get(_class) as Layout<Class<Obj>>)._extends
    }
    return result
  }

  dump () {
    const result = []
    for (const doc of this.objects.values()) {
      result.push(doc)
    }
    return result
  }

  loadModel (model: DocLayout[]) {
    for (const doc of model) { this.set(doc) }
    // if (this.byClass === null) { this.byClass = new Map<Ref<ClassLayout>, Layout<Doc>[]>() }
    // for (const doc of model) { this.index(doc) }
  }

  findClass (query: AnyLayout): Layout<Class<Obj>>[] {
    const byClass = this.objectsOfClass(ClassClass)
    return findAll(byClass, ClassClass, query) as Layout<Class<Obj>>[]
  }

  // Q U E R Y
  async find (clazz: Ref<Class<Doc>>, query: AnyLayout): Promise<Layout<Doc>[]> {
    const byClass = this.objectsOfClass(clazz)
    return findAll(byClass, clazz, query)
  }

  async findOne (clazz: Ref<Class<Doc>>, query: AnyLayout): Promise<Layout<Doc> | undefined> {
    const result = await this.find(clazz, query)
    return result.length === 0 ? undefined : result[0]
  }
}

export function findAll (docs: Layout<Doc>[], clazz: Ref<Class<Doc>>, query: AnyLayout): Layout<Doc>[] {
  let result = docs

  for (const key in query) {
    const condition = query[key]
    const aKey = attributeKey(clazz, key)
    result = filterEq(result, aKey, condition)
  }

  return result === docs ? docs.concat() : result
}

function filterEq (docs: Layout<Doc>[], propertyKey: string, value: LayoutType): Layout<Doc>[] {
  const result: Layout<Doc>[] = []
  for (const doc of docs) {
    if (value === (doc as any)[propertyKey]) {
      result.push(doc)
    }
  }
  return result
}
