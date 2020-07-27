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

import { MongoClient } from 'mongodb'
import { Model, Strings } from './boot'

const modelJson = JSON.stringify(Model, null, 2)
console.log(modelJson)

const stringsJson = JSON.stringify(Strings)
console.log(stringsJson)

function dumpToFile () {
  const fs = require('fs')

  fs.writeFile(__dirname + "/../../prod/src/model.json", modelJson, 'utf8', function (err: Error) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.")
      return console.log(err);
    }
    console.log("model saved.")
  })

  fs.writeFile(__dirname + "/../../prod/src/strings.json", stringsJson, 'utf8', function (err: Error) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.")
      return console.log(err);
    }
    console.log("strings saved.")
  })
}

function initDatabase (uri: string, tenant: string) {
  MongoClient.connect(uri, { useUnifiedTopology: true }, (err, client) => {
    const db = client.db(tenant)
    for (const domain in Model) {
      const model = Model[domain]
      db.collection(domain, (err, coll) => {
        coll.deleteMany({}, () => {
          coll.insertMany(model).then(() => { client.close() })
        })
      })
    }
  })

}

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
console.log('uploading new model to MongoDB ...' + mongodbUri.substring(25))
initDatabase(mongodbUri, 'latest-model')
dumpToFile()

