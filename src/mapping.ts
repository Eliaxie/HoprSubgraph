import { Address, BigInt } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import {
  HoprChannels,
  Announcement,
  ChannelBumped,
  ChannelClosureFinalized,
  ChannelClosureInitiated,
  ChannelFunded,
  ChannelOpened,
  TicketRedeemed
} from "../generated/HoprChannels/HoprChannels"
import { Channel, AddressNode } from "../generated/schema"

export function handleAnnouncement(event: Announcement): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = AddressNode.load(event.params.account.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new AddressNode(event.params.account.toHex())

    // Entity fields can be set using simple assignments
  }

  // BigInt and BigDecimal math are supported
  entity.hoprAddress = event.params.multiaddr.toBase58()

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.FUND_CHANNEL_MULTI_SIZE(...)
  // - contract.TOKENS_RECIPIENT_INTERFACE_HASH(...)
  // - contract.canImplementInterfaceForAddress(...)
  // - contract.channels(...)
  // - contract.multicall(...)
  // - contract.publicKeys(...)
  // - contract.secsClosure(...)
  // - contract.token(...)
}

export function handleChannelBumped(event: ChannelBumped): void { }

export function handleChannelClosureFinalized(
  event: ChannelClosureFinalized
): void { }

export function handleChannelClosureInitiated(
  event: ChannelClosureInitiated
): void {

  let source = AddressNode.load(event.params.source.toHex())
  let destination = AddressNode.load(event.params.destination.toHex())
  if (!source || !destination) {
    throw "ChannelOpenEvent trying to use a non-existing source or destionation address, source: " + source + " destionation: " + destination
  }
  let entity = Channel.load(source.id + ":%:" + destination.id)

  if (!entity) {
    log.error('Trying to close a non-existing channel: source {}, destionation: {}', [source.id, destination.id])

    entity = new Channel(source.id + ":%:" + destination.id)

    entity.source = source.id

    entity.destination = destination.id

    entity.importanceScore = 0

    entity.status = "Unknown"

    entity.save()
  }

  entity.importanceScore = 0

  entity.status = "Closed"

  entity.save()
}

export function handleChannelFunded(event: ChannelFunded): void { }

export function handleChannelOpened(event: ChannelOpened): void {

  let source = AddressNode.load(event.params.source.toHex())
  let destination = AddressNode.load(event.params.destination.toHex())
  if (!source || !destination) {
    throw "ChannelOpenEvent trying to use a non-existing source or destionation address, source: " + source + " destination: " + destination
  }
  let entity = Channel.load(source.id + ":%:" + destination.id)

  if (entity && entity.status == "Unknown") {
    log.error('Trying to open a previously broken channel: source {}, destionation: {}', [source.id, destination.id])
    return
  }

  if (!entity) {
    entity = new Channel(source.id + ":%:" + destination.id)
  }

  entity.source = source.id

  entity.destination = destination.id

  entity.importanceScore = 0

  entity.status = "Open"

  entity.save()
}

export function handleTicketRedeemed(event: TicketRedeemed): void { }