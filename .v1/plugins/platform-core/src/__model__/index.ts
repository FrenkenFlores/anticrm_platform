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

import core, {
  Obj, Ref, Class, Type, BagOf, ArrayOf, InstanceOf, Emb, CreateTx, Tx, VDoc
} from '..'

import { extendIds } from './utils'

export default extendIds(core, {
  class: {
    Obj: '' as Ref<Class<Obj>>,
    Emb: '' as Ref<Class<Emb>>,

    Type: '' as Ref<Class<Type<any>>>,
    BagOf: '' as Ref<Class<BagOf<any>>>,
    ArrayOf: '' as Ref<Class<ArrayOf<any>>>,
    InstanceOf: '' as Ref<Class<InstanceOf<Emb>>>,
    Metadata: '' as Ref<Class<Type<any>>>,
    Resource: '' as Ref<Class<Type<any>>>,

    Date: '' as Ref<Class<Type<Date>>>,

    VDoc: '' as Ref<Class<VDoc>>,
    Tx: '' as Ref<Class<Tx>>,
    CreateTx: '' as Ref<Class<CreateTx>>
  }
})
