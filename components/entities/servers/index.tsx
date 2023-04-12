import { ServerFragment } from '#gql'
import { z } from 'zod'
import { QChip } from 'quasar'
import {
  MinimalColumnDefinition,
  BtnModelTableActionsDefinition,
} from '@/types'
import { Model } from '~~/utils/model'
import { Peers } from './peers'
import { NuxtLink } from '#components'
import EditDialog from './edit.vue'

export type Item = ServerFragment

export const schemaAdd = z.object({
  name: z.string().min(3).default(''),
  address: z.string().default(''),
  description: z.string().default(''),
  dns: z.string().array().min(1).default([]),
  enabled: z.boolean().optional().default(false),
  firewallMark: z.number().optional(),
  listenPort: z.number().min(0).max(65535).optional(),
  mtu: z.number().min(1280).max(1500).optional(),
  privateKey: z.string().default(''),
  publicKey: z.string().default(''),
})

export const schemaUpdate = z.object({
  address: z.string().optional().default(''),
  description: z.string().optional().default(''),
  dns: z.string().array().min(1).optional().default([]),
  enabled: z.boolean().optional().default(false),
  firewallMark: z.number().optional(),
  listenPort: z.number().min(0).max(65535).optional(),
  mtu: z.number().min(1280).max(1500).optional(),
  privateKey: z.string().optional().default(''),
  publicKey: z.string().min(10).default(''),
})

async function listFn() {
  return await gqlServers()
}

async function findFn(id: Item['id']) {
  const res = await gqlServer({ id })
  return res.data
}

async function updateFn(item: Item, input: z.infer<typeof schemaUpdate>) {
  input = schemaUpdate.parse(input)

  const res = await gqlUpdateServer({
    input: {
      ...input,
      id: item.id,
    },
  })
  return res.mutation.data
}

async function addFn(input: z.infer<typeof schemaAdd>) {
  input = schemaAdd.parse(input)

  const res = await gqlCreateServer({ input })
  return res.mutation.data
}

async function delFn(id: Item['id']) {
  const res = await gqlDeleteServer({ input: { id } })
  return res.mutation
}

export interface Servers extends Item {}

export class Servers extends Model {
  static slug = 'servers'
  static columns: MinimalColumnDefinition<Servers>[] = [
    {
      name: 'name',
      format(v, item) {
        const addr = `${item.address}:${item.listenPort}`

        return (
          <div class="-grid">
            <NuxtLink to={`/servers/${item.$id}/peers`} class="-app-link">
              {item.name}
            </NuxtLink>
            <span class="-opacity-70">{addr}</span>
          </div>
        )
      },
    },
    { name: 'enabled', align: 'center' },
    { name: 'running', align: 'center' },
    // 'listenPort',
    // 'address',
    {
      name: 'peers',
      format: (v, item) => {
        const max = 3
        const more = Math.max((item.peers?.length || 0) - max, 0)
        return (
          <div class="-flex -flex-wrap -gap-2">
            {item.peers?.slice(0, max)?.map((e) => (
              <QChip outline color="secondary" size="sm">
                {e.name}
              </QChip>
            ))}
            {!!more && (
              <QChip class="-opacity-70" size="sm">
                {more} more
              </QChip>
            )}
          </div>
        )
      },
    },
    { name: 'createdAt', align: 'right' },
  ]
  static schemeAdd = schemaAdd
  static schemeUpdate = schemaUpdate
  static listFn = listFn
  static findFn = findFn
  static updateFn = updateFn
  static addFn = addFn
  static delFn = delFn
  edit() {
    return super.edit({
      component: EditDialog,
    })
  }

  async start() {
    await gqlStartServer({ input: { id: this.id } })
    refreshNuxtData(this.$model.slug)
  }
  async stop() {
    await gqlStopServer({ input: { id: this.id } })
    refreshNuxtData(this.$model.slug)
  }

  get tableActions(): BtnModelTableActionsDefinition {
    const item = this
    const defaults = super.tableActions
    return [
      [
        'start/stop',
        {
          disable: !item.enabled,
          icon: item.running ? 'stop' : 'play_arrow',
          color: item.running ? 'warning' : 'positive',
          onClick: () => (item.running ? item.stop() : item.start()),
        },
      ],
      ...defaults,
    ] as BtnModelTableActionsDefinition
  }

  get $peersModel() {
    return Peers.of(this)
  }
}

export default Servers
