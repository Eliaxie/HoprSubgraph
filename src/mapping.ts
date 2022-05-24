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
import { Channel, Account, Ticket } from "../generated/schema"
import { convertEthToDecimal, getChannelId, getOrInitiateAccount, initiateChannel, oneBigInt } from "./library"

export function handleAnnouncement(event: Announcement): void {
  log.info(`[ info ] Address of the account announcing itself: {}`, [event.params.account.toHex()]);
  let accountId = event.params.account.toHex();
  let account = getOrInitiateAccount(accountId)
  let multiaddr = account.multiaddr

  if (multiaddr.indexOf(event.params.multiaddr) == -1) {
    multiaddr.push(event.params.multiaddr)
  }
  account.multiaddr = multiaddr
  account.publicKey = event.params.publicKey;
  account.hasAnnounced = true;
  account.save()
}

export function handleChannelBumped(event: ChannelBumped): void { }

export function handleChannelClosureFinalized(
  event: ChannelClosureFinalized
): void { }

export function handleChannelClosureInitiated(
  event: ChannelClosureInitiated
): void {
  log.info(`[ info ] Handle channel update: start {}`, [event.transaction.hash.toHex()]);
  // channel source
  let sourceId = event.params.source.toHex();
  let source = getOrInitiateAccount(sourceId)
  log.info(`[ info ] Handle channel update: source {}`, [event.transaction.hash.toHex()]);

  // channel destination
  let destinationId = event.params.destination.toHex();
  let destination = getOrInitiateAccount(destinationId)
  log.info(`[ info ] Handle channel update: destination {}`, [event.transaction.hash.toHex()]);


  let channelId = getChannelId(event.params.source, event.params.destination).toHex()
  let channel = Channel.load(channelId)
  log.info(`[ info ] Address of the account updating the channel: {}`, [channelId]);
  if (channel == null) {
    log.error('Trying to close a non-open channel: {}', [channelId])
    return;
  }

  channel.status = "CLOSED"

  source.save();
  channel.save();
}

export function handleChannelFunded(event: ChannelFunded): void { }

export function handleChannelOpened(event: ChannelOpened): void {
  log.info(`[ info ] Handle channel update: start {}`, [event.transaction.hash.toHex()]);
  // channel source
  let sourceId = event.params.source.toHex();
  let source = getOrInitiateAccount(sourceId)
  log.info(`[ info ] Handle channel update: source {}`, [event.transaction.hash.toHex()]);

  // channel destination
  let destinationId = event.params.destination.toHex();
  let destination = getOrInitiateAccount(destinationId)
  log.info(`[ info ] Handle channel update: destination {}`, [event.transaction.hash.toHex()]);


  let channelId = getChannelId(event.params.source, event.params.destination).toHex()
  let channel = Channel.load(channelId)
  log.info(`[ info ] Address of the account updating the channel: {}`, [channelId]);
  if (channel == null) {
    // update channel count
    log.info('New channel', [])
    source.fromChannelsCount = source.fromChannelsCount.plus(oneBigInt())
    destination.toChannelsCount = destination.toChannelsCount.plus(oneBigInt())
    destination.save();
    channel = initiateChannel(channelId, sourceId, destinationId)
  }

  channel.status = "OPEN"

  source.save();
  channel.save();
}

export function handleTicketRedeemed(event: TicketRedeemed): void {
  // get the channel epoch, which is not part of the event
  let channelContract = HoprChannels.bind(event.address)
  let channelId = getChannelId(event.params.source, event.params.destination);
  let channelEpoch = channelContract.channels(channelId).value5
  let ticketEpoch = event.params.ticketEpoch
  let ticketIndex = event.params.ticketIndex
  // create new ticket
  let ticketId = channelId.toHex() + "-" + channelEpoch.toString() + "-" + ticketEpoch.toString() + "-" + ticketIndex.toString()
  let ticket = new Ticket(ticketId)
  ticket.channel = channelId.toHex()
  ticket.nextCommitment = event.params.nextCommitment
  ticket.ticketEpoch = ticketEpoch
  ticket.ticketIndex = ticketIndex
  ticket.proofOfRelaySecret = event.params.proofOfRelaySecret
  ticket.amount = convertEthToDecimal(event.params.amount)
  ticket.winProb = event.params.winProb
  ticket.signature = event.params.signature
  // update channel
  let channel = Channel.load(channelId.toHex())
  if (channel == null) {
    log.error("Redeem a ticket for non-existing channel", [])
    return
  } else {
    channel.redeemedTicketCount = channel.redeemedTicketCount.plus(oneBigInt())
  }
  channel.save()
  ticket.save()
}
