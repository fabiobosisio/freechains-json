const { Map, List, Set, fromJS } = require('immutable')
const { SkipList } = require('./skip_list')
const { decodeChange, decodeChangeMeta, appendEdit } = require('./columnar')
const { parseOpId } = require('../src/common')

// Returns true if all changes that causally precede the given change
// have already been applied in `opSet`.
function causallyReady(opSet, change) {
  for (let hash of change.deps) {
    if (!opSet.hasIn(['hashes', hash])) return false
  }
  return true
}

/**
 * Returns the path from the root object to the given objectId, as an array of
 * operations describing the objects and keys traversed. If there are several
 * paths to the same object, returns one of the paths arbitrarily. Returns
 * null if there is no path (e.g. if the object has been deleted).
 */
function getPath(opSet, objectId) {
  let path = []
  while (objectId !== '_root') {
    const ref = opSet.getIn(['byObject', objectId, '_inbound'], Set()).first()
    if (!ref) return null
    path.unshift(ref)
    objectId = ref.get('obj')
  }
  return path
}

/**
 * Returns a string that is either 'map', 'table', 'list', or 'text', indicating
 * the type of the object with ID `objectId`.
 */
function getObjectType(opSet, objectId) {
  if (objectId === '_root') return 'map'
  const objInit = opSet.getIn(['byObject', objectId, '_init', 'action'])
  const type = {makeMap: 'map', makeTable: 'table', makeList: 'list', makeText: 'text'}[objInit]
  if (!type) throw new RangeError(`Unknown object type ${objInit} for ${objectId}`)
  return type
}

// Processes a 'makeMap', 'makeList', 'makeTable', or 'makeText' operation
function applyMake(opSet, op, patch) {
  const objectId = getChildId(op), action = op.get('action')
  if (opSet.hasIn(['byObject', objectId, '_keys'])) throw new Error(`Duplicate creation of object ${objectId}`)

  let object = Map({_init: op, _inbound: Set(), _keys: Map()})
  if (action === 'makeList' || action === 'makeText') {
    object = object.set('_elemIds', new SkipList())
  }
  opSet = opSet.setIn(['byObject', objectId], object)

  if (patch) {
    patch.objectId = objectId
    patch.type = getObjectType(opSet, objectId)
    patch.props = {}
    if (patch.type === 'list' || patch.type === 'text') patch.edits = []
  }
  return opSet
}

// Processes an insertion operation. Does not modify any patch because the new list element
// only becomes visible through the assignment of a value to the new list element.
function applyInsert(opSet, op) {
  const objectId = op.get('obj'), opId = op.get('opId')
  if (!opSet.get('byObject').has(objectId)) throw new Error(`Modification of unknown object ${objectId}`)
  if (opSet.hasIn(['byObject', objectId, '_insertion', opId])) throw new Error(`Duplicate list element ID ${opId}`)
  if (!op.get('elemId')) throw new RangeError('insert operation has no key')

  return opSet
    .updateIn(['byObject', objectId, '_following', op.get('elemId')], List(), list => list.push(op))
    .setIn(['byObject', objectId, '_insertion', opId], op)
}

function updateListElement(opSet, objectId, elemId, patch) {
  const ops = getFieldOps(opSet, objectId, elemId)
  let elemIds = opSet.getIn(['byObject', objectId, '_elemIds'])
  let index = elemIds.indexOf(elemId)

  if (index >= 0) {
    if (ops.isEmpty()) {
      elemIds = elemIds.removeIndex(index)
    } else {
      elemIds = elemIds.setValue(elemId, ops.first().get('value'))
    }
    setPatchEditsForList(opSet, objectId, elemId, index, false, patch)

  } else {
    if (ops.isEmpty()) return opSet // deleting a non-existent element = no-op

    // find the index of the closest preceding list element
    let prevId = elemId
    while (true) {
      index = -1
      prevId = getPrevious(opSet, objectId, prevId)
      if (!prevId) break
      index = elemIds.indexOf(prevId)
      if (index >= 0) break
    }

    index += 1
    elemIds = elemIds.insertIndex(index, elemId, ops.first().get('value'))
    setPatchEditsForList(opSet, objectId, elemId, index, true, patch)
  }
  return opSet.setIn(['byObject', objectId, '_elemIds'], elemIds)
}

/**
 * Returns true if the operation `op` introduces a child object.
 */
function isChildOp(op) {
  const action = op.get('action')
  return action.startsWith('make') || action === 'link'
}

/**
 * Returns the object ID of the child introduced by `op`.
 */
function getChildId(op) {
  return op.get('child', op.get('opId'))
}

/**
 * Returns the key that is updated by the given operation. In the case of lists and text,
 * the key is the element ID; in the case of maps, it is the property name.
 */
function getOperationKey(op) {
  const keyStr = op.get('key')
  if (keyStr) return keyStr
  const key = op.get('insert') ? op.get('opId') : op.get('elemId')
  if (!key) throw new RangeError(`operation has no key: ${op}`)
  return key
}

/**
 * Processes a 'set', 'del', 'make*', 'link', or 'inc' operation. Mutates `patch`
 * to describe the change and returns an updated `opSet`.
 */
function applyAssign(opSet, op, patch) {
  const objectId = op.get('obj'), action = op.get('action'), key = getOperationKey(op)
  if (!opSet.get('byObject').has(objectId)) throw new RangeError(`Modification of unknown object ${objectId}`)
  const type = getObjectType(opSet, objectId)

  if (patch) {
    patch.objectId = patch.objectId || objectId
    if (patch.objectId !== objectId) {
      throw new RangeError(`objectId mismatch in patch: ${patch.objectId} != ${objectId}`)
    }

    patch.type = patch.type || type
    if (patch.type !== type) {
      throw new RangeError(`object type mismatch in patch: ${patch.type} != ${type}`)
    }

    if (type !== 'list' && type !== 'text' && !patch.props[key]) patch.props[key] = {}
  }

  if (action.startsWith('make')) {
    if (patch) {
      const valuePatch = {}
      opSet = applyMake(opSet, op, valuePatch)
      if (type === 'map' || type === 'table') {
        patch.props[key][op.get('opId')] = valuePatch
      }
    } else {
      opSet = applyMake(opSet, op)
    }
  }
  if (action === 'link' && patch) {
    patch.props[key][op.get('opId')] = constructObject(opSet, getChildId(op))
  }

  const ops = getFieldOps(opSet, objectId, key)
  let overwritten, remaining

  if (action === 'inc') {
    overwritten = List()
    remaining = ops.map(other => {
      if (other.get('action') === 'set' && typeof other.get('value') === 'number' &&
          other.get('datatype') === 'counter' && op.get('pred').includes(other.get('opId'))) {
        return other.set('value', other.get('value') + op.get('value'))
      } else {
        return other
      }
    })
  } else {
    const priorOpsOverwritten = ops.groupBy(other => op.get('pred').includes(other.get('opId')))
    overwritten = priorOpsOverwritten.get(true,  List())
    remaining   = priorOpsOverwritten.get(false, List())
  }

  // If any child object references were overwritten, remove them from the index of inbound links
  for (let old of overwritten.filter(isChildOp)) {
    opSet = opSet.updateIn(['byObject', getChildId(old), '_inbound'], ops => ops.remove(old))
  }

  if (isChildOp(op)) {
    opSet = opSet.updateIn(['byObject', getChildId(op), '_inbound'], Set(), ops => ops.add(op))
  }
  if (action === 'set' || isChildOp(op)) { // not 'inc' or 'del'
    remaining = remaining.push(op)
  }
  remaining = remaining.sort(lamportCompare).reverse()
  opSet = opSet.setIn(['byObject', objectId, '_keys', key], remaining)

  if (type === 'list' || type === 'text') {
    opSet = updateListElement(opSet, objectId, key, patch)
  } else {
    setPatchPropsForMap(opSet, objectId, key, patch)
  }
  return opSet
}

/**
 * Updates `patch` with the fields required in a patch. `pathOp` is an operation
 * along the path from the root to the object being modified, as returned by
 * `getPath()`. Returns the sub-object representing the child identified by this
 * operation.
 */
function initializePatch(opSet, pathOp, patch) {
  const objectId = pathOp.get('obj'), opId = pathOp.get('opId'), key = getOperationKey(pathOp)
  const type = getObjectType(opSet, objectId)
  patch.objectId = patch.objectId || objectId
  patch.type     = patch.type     || type

  if (patch.objectId !== objectId) {
    throw new RangeError(`objectId mismatch in path: ${patch.objectId} != ${objectId}`)
  }
  if (patch.type !== type) {
    throw new RangeError(`object type mismatch in path: ${patch.type} != ${type}`)
  }

  if (!patch.props[key] || !patch.props[key][opId]) {
    if (type === 'list' || type === 'text') {
      const index = opSet.getIn(['byObject', objectId, '_elemIds']).indexOf(key)
      setPatchEditsForList(opSet, objectId, key, index, false, patch)
    } else {
      setPatchPropsForMap(opSet, objectId, key, patch)
    }
  }
  if (patch.props[key][opId] === undefined) {
    throw new RangeError(`field ops for ${key} did not contain opId ${opId}`)
  }
  return patch.props[key][opId]
}

/**
 * Constructs a patch for the value created by a particular operation.
 */
function makePatchForOperation(opSet, op) {
  if (op.get('action') === 'set') {
    const patch = {type: 'value', value: op.get('value')}
    if (op.get('datatype')) patch.datatype = op.get('datatype')
    return patch

  } else if (isChildOp(op)) {
    const childId = getChildId(op), type = getObjectType(opSet, childId)
    if (type === 'list' || type === 'text') {
      return {objectId: childId, type, props: {}, edits: []}
    } else {
      return {objectId: childId, type, props: {}}
    }

  } else {
    throw new RangeError(`Unexpected operation in field ops: ${op.get('action')}`)
  }
}

/**
 * Updates `patch` to include all the values (including conflicts) for the field
 * `key` of the object with ID `objectId`.
 */
function setPatchPropsForMap(opSet, objectId, key, patch) {
  if (!patch) return
  if (!patch.props[key]) patch.props[key] = {}

  const ops = {}
  for (let op of getFieldOps(opSet, objectId, key)) {
    const opId = op.get('opId')
    ops[opId] = true
    if (!isChildOp(op) || !patch.props[key][opId]) {
      patch.props[key][opId] = makePatchForOperation(opSet, op)
    }
  }

  // Remove any values that appear in the patch, but were not returned by getFieldOps()
  for (let opId of Object.keys(patch.props[key])) {
    if (!ops[opId]) {
      delete patch.props[key][opId]
    }
  }
}

/**
 * Updates `patch` to include edits for all the values at a particular index. This is usually one
 * edit, but may be multiple in the case of a conflict at this list element.
 */
function setPatchEditsForList(opSet, listId, elemId, index, insert, patch) {
  if (!patch) return
  setPatchPropsForMap(opSet, listId, elemId, patch)
  if (Object.keys(patch.props[elemId]).length === 0) {
    appendEdit(patch.edits, {action: 'remove', index, count: 1})
    return
  }

  // If the most recent existing edit is for the same index, we need to remove it, since the patch
  // format for lists treats several consecutive updates for the same index as a conflict.
  while (!insert && patch.edits.length > 0 && patch.edits[patch.edits.length - 1].index === index &&
         ['insert', 'update'].includes(patch.edits[patch.edits.length - 1].action)) {
    const previousEdit = patch.edits.pop()
    insert = (previousEdit.action === 'insert')
  }

  for (const opId of Object.keys(patch.props[elemId]).sort(opIdCompare)) {
    const value = patch.props[elemId][opId]
    if (insert) {
      appendEdit(patch.edits, {action: 'insert', index, elemId, opId, value})
    } else {
      appendEdit(patch.edits, {action: 'update', index, opId, value})
    }
    insert = false
  }
}

/**
 * Recursively walks a patch, removing any internal information that should not be returned through
 * the API. This should be done after all the changes have been applied, since we need to preserve
 * the internal information across several calls to `OpSet.addChange()`.
 */
function finalizePatch(diff) {
  if (!diff) return
  if (diff.type === 'list' || diff.type === 'text') {
    delete diff.props // this is the actual property being deleted
    for (let edit of diff.edits) finalizePatch(edit.value)
  } else if (diff.type === 'map' || diff.type === 'table') {
    for (const prop of Object.keys(diff.props)) {
      for (const opId of Object.keys(diff.props[prop])) {
        finalizePatch(diff.props[prop][opId])
      }
    }
  }
}

/**
 * Applies the operations in the `change` to `opSet`. As a side-effect, `patch`
 * is mutated to describe the changes. Returns the updated `opSet`.
 */
function applyOps(opSet, change, patch) {
  const actor = change.get('actor'), startOp = change.get('startOp')
  let newObjects = Set()
  change.get('ops').forEach((op, index) => {
    const action = op.get('action'), obj = op.get('obj'), insert = op.get('insert')
    if (!['set', 'del', 'inc', 'link', 'makeMap', 'makeList', 'makeText', 'makeTable'].includes(action)) {
      throw new RangeError(`Unknown operation action: ${action}`)
    }
    if (!op.get('pred')) {
      throw new RangeError(`Missing 'pred' field in operation ${op}`)
    }

    let localPatch
    if (patch) {
      const path = getPath(opSet, obj)
      if (path !== null) {
        localPatch = patch
        for (let pathOp of path) localPatch = initializePatch(opSet, pathOp, localPatch)
      }
    }

    const opWithId = op.merge({opId: `${startOp + index}@${actor}`})
    if (insert) {
      opSet = applyInsert(opSet, opWithId)
    }
    if (action.startsWith('make')) {
      newObjects = newObjects.add(getChildId(opWithId))
    }
    opSet = applyAssign(opSet, opWithId, localPatch)
  })
  return opSet
}

/**
 * Applies the changeset `change` to `opSet` (unless it has already been applied,
 * in which case we do nothing). As a side-effect, `patch` is mutated to describe
 * the changes. Returns the updated `opSet`.
 */
function applyChange(opSet, binaryChange, patch) {
  const change = fromJS(decodeChange(binaryChange))
  const actor = change.get('actor'), seq = change.get('seq'), startOp = change.get('startOp'), hash = change.get('hash')
  if (typeof actor !== 'string' || typeof seq !== 'number' || typeof startOp !== 'number') {
    throw new TypeError(`Missing change metadata: actor = ${actor}, seq = ${seq}, startOp = ${startOp}`)
  }
  if (opSet.hasIn(['hashes', hash])) return opSet // change already applied, return unchanged

  const expectedSeq = opSet.getIn(['states', actor], List()).size + 1
  if (seq !== expectedSeq) {
    throw new RangeError(`Expected change ${expectedSeq} by ${actor}, got change ${seq}`)
  }

  let maxOpId = 0
  for (let depHash of change.get('deps')) {
    const depOpId = opSet.getIn(['hashes', depHash, 'maxOpId'])
    if (depOpId === undefined) throw new RangeError(`Unknown dependency hash ${depHash}`)
    maxOpId = Math.max(maxOpId, depOpId)
    opSet = opSet.updateIn(['hashes', depHash, 'depsFuture'], Set(), future => future.add(hash))
  }
  if (startOp !== maxOpId + 1) {
    throw new RangeError(`Expected startOp to be ${maxOpId + 1}, was ${startOp}`)
  }

  let queue = change.get('deps'), sameActorDep = (seq === 1)
  while (!sameActorDep && !queue.isEmpty()) {
    const dep = opSet.getIn(['hashes', queue.first()])
    queue = queue.shift()
    if (dep.get('actor') === actor && dep.get('seq') === seq - 1) {
      sameActorDep = true
    } else {
      queue = queue.concat(dep.get('depsPast'))
    }
  }
  if (!sameActorDep) {
    throw new RangeError('Change lacks dependency on prior sequence number by the same actor')
  }

  const changeInfo = Map({
    actor, seq, startOp,
    change: binaryChange,
    maxOpId: startOp + change.get('ops').size - 1,
    depsPast: change.get('deps').toSet(),
    depsFuture: Set()
  })

  opSet = applyOps(opSet, change, patch)
  return opSet
    .setIn(['hashes', hash], changeInfo)
    .updateIn(['states', actor], List(), prior => prior.push(hash))
    .update('deps', deps => deps.subtract(change.get('deps')).add(hash))
    .update('maxOp', maxOp => Math.max(maxOp, changeInfo.get('maxOpId')))
    .update('history', history => history.push(hash))
}

function applyQueuedOps(opSet, patch) {
  let queue = List()
  while (true) {
    for (let change of opSet.get('queue')) {
      if (causallyReady(opSet, decodeChangeMeta(change, false))) {
        opSet = applyChange(opSet, change, patch)
      } else {
        queue = queue.push(change)
      }
    }

    if (queue.count() === opSet.get('queue').count()) return opSet
    opSet = opSet.set('queue', queue)
    queue = List()
  }
}

function init() {
  return Map()
    .set('states',   Map())
    .set('history',  List())
    .set('byObject', Map().set('_root', Map().set('_keys', Map())))
    .set('hashes',   Map())
    .set('deps',     Set())
    .set('maxOp',     0)
    .set('queue',    List())
}

/**
 * Adds `change` to `opSet` without any modification
 * (e.g. because it's a remote change, or we have loaded it from disk). `change`
 * is given as an Immutable.js Map object. `patch` is mutated to describe the
 * change (in the format used by patches).
 */
function addChange(opSet, change, patch) {
  opSet = opSet.update('queue', queue => queue.push(change))
  return applyQueuedOps(opSet, patch)
}

/**
 * Applies a change made by the local user and adds it to `opSet`. The `change`
 * is given as an Immutable.js Map object. `patch` is mutated to describe the
 * change (in the format used by patches).
 */
function addLocalChange(opSet, change, patch) {
  return applyChange(opSet, change, patch)
}

/**
 * Returns an array of hashes of the current "head" changes (i.e. those changes
 * that no other change depends on).
 */
function getHeads(opSet) {
  return opSet.get('deps').toArray().sort()
}

/**
 * If `opSet` has applied a change with the given `hash` (given as a hexadecimal
 * string), returns that change (as a byte array). Returns undefined if no
 * change with that hash has been applied. A change with missing dependencies
 * does not count as having been applied.
 */
function getChangeByHash(opSet, hash) {
  return opSet.getIn(['hashes', hash, 'change'])
}

/**
 * Returns all the changes in `opSet` that need to be sent to another replica.
 * `haveDeps` is an Immutable.js List object containing the hashes (as hex
 * strings) of the heads that the other replica has. Those changes in `haveDeps`
 * and any of their transitive dependencies will not be returned; any changes
 * later than or concurrent to the hashes in `haveDeps` will be returned.
 * If `haveDeps` is an empty list, all changes are returned. Throws an exception
 * if any of the given hashes are not known to this replica.
 */
function getMissingChanges(opSet, haveDeps) {
  // If the other replica has nothing, return all changes in history order
  if (haveDeps.isEmpty()) {
    return opSet.get('history').toArray().map(hash => getChangeByHash(opSet, hash))
  }

  // Fast path for the common case where all new changes depend only on haveDeps
  let stack = List(), seenHashes = {}, toReturn = []
  for (let hash of haveDeps) {
    seenHashes[hash] = true
  //  const successors = opSet.getIn(['hashes', hash, 'depsFuture']) // comentei Fabio Bosisio
  //  if (!successors) throw new RangeError(`hash not found: ${hash}`) // comentei Fabio Bosisio
  //  stack = stack.concat(successors) // comentei Fabio Bosisio
  }

  // Depth-first traversal of the hash graph to find all changes that depend on `haveDeps`
  while (!stack.isEmpty()) {
    const hash = stack.last()
    seenHashes[hash] = true
    toReturn.push(hash)
    if (!opSet.getIn(['hashes', hash, 'depsPast']).every(dep => seenHashes[dep])) {
      // If a change depends on a hash we have not seen, abort the traversal and fall back to the
      // slower algorithm. This will sometimes abort even if all new changes depend on `haveDeps`,
      // because our depth-first traversal is not necessarily a topological sort of the graph.
      break
    }
    stack = stack.pop().concat(opSet.getIn(['hashes', hash, 'depsFuture']))
  }

  // If the traversal above has encountered all the heads, and was not aborted early due to
  // a missing dependency, then the set of changes it has found is complete, so we can return it
  if (stack.isEmpty() && opSet.get('deps').every(head => seenHashes[head])) {
    return toReturn.map(hash => getChangeByHash(opSet, hash))
  }

  // If we haven't encountered all of the heads, we have to search harder. This will happen if
  // changes were added that are concurrent to `haveDeps`
  stack = haveDeps; seenHashes = {}
  while (!stack.isEmpty()) {
    const hash = stack.last()
    stack = stack.pop()
    if (!seenHashes[hash]) {
    //  const deps = opSet.getIn(['hashes', hash, 'depsPast']) // comentei Fabio Bosisio
     // if (!deps) throw new RangeError(`hash not found: ${hash}`)// comentei Fabio Bosisio
     // stack = stack.concat(deps)// comentei Fabio Bosisio
      seenHashes[hash] = true
    }
  }

  return opSet.get('history')
    .filter(hash => !seenHashes[hash])
    .map(hash => getChangeByHash(opSet, hash))
    .toArray()
}

/**
 * Returns all changes that are present in `opSet2` but not present in `opSet1`.
 */
function getChangesAdded(opSet1, opSet2) {
  // Depth-first traversal from the heads through the dependency graph,
  // until we reach a change that is already present in opSet1
  let stack = opSet2.get('deps').toArray(), seenHashes = {}, toReturn = []
  while (stack.length > 0) {
    const hash = stack.pop()
    if (!seenHashes[hash] && !getChangeByHash(opSet1, hash)) {
      seenHashes[hash] = true
      toReturn.push(hash)
      stack.push(...opSet2.getIn(['hashes', hash, 'depsPast']))
    }
  }

  // Return those changes in the reverse of the order in which the depth-first search
  // found them. This is not necessarily a topological sort, but should usually be close.
  return toReturn.reverse().map(hash => getChangeByHash(opSet2, hash))
}

/**
 * Returns the hashes of any missing dependencies, i.e. where we have applied a
 * change that has a dependency on a change we have not seen.
 *
 * If the argument `heads` is given (an array of hexadecimal strings representing
 * hashes as returned by `getHeads()`), this function also ensures that all of
 * those hashes resolve to either a change that has been applied to the document,
 * or that has been enqueued for later application once missing dependencies have
 * arrived. Any missing heads hashes are included in the returned array.
 */
function getMissingDeps(opSet, heads = []) {
  let missing = {}, inQueue = {}
  for (let binaryChange of opSet.get('queue')) {
    const change = decodeChangeMeta(binaryChange, true)
    inQueue[change.hash] = true
    for (let depHash of change.deps) {
      if (!opSet.hasIn(['hashes', depHash])) missing[depHash] = true
    }
  }
  for (let head of heads) {
    if (!opSet.hasIn(['hashes', head])) missing[head] = true
  }
  return Object.keys(missing).filter(hash => !inQueue[hash]).sort()
}

function getFieldOps(opSet, objectId, key) {
  return opSet.getIn(['byObject', objectId, '_keys', key], List())
}

function getParent(opSet, objectId, key) {
  if (key === '_head') return
  const insertion = opSet.getIn(['byObject', objectId, '_insertion', key])
  if (!insertion) throw new TypeError(`Missing index entry for list element ${key}`)
  return insertion.get('elemId')
}

/**
 * Compares the opIds of two operations using Lamport timestamp ordering
 */
function lamportCompare(op1, op2) {
  return opIdCompare(op1.get('opId'), op2.get('opId'))
}

/**
 * Compares two opIds using Lamport timestamp ordering
 */
function opIdCompare(id1, id2) {
  const time1 = parseOpId(id1), time2 = parseOpId(id2)
  if (time1.counter < time2.counter) return -1
  if (time1.counter > time2.counter) return  1
  if (time1.actorId < time2.actorId) return -1
  if (time1.actorId > time2.actorId) return  1
  return 0
}

function insertionsAfter(opSet, objectId, parentId, childId) {
  let childKey = null
  if (childId) childKey = Map({opId: childId})

  return opSet
    .getIn(['byObject', objectId, '_following', parentId], List())
    .filter(op => op.get('insert') && (!childKey || lamportCompare(op, childKey) < 0))
    .sort(lamportCompare)
    .reverse() // descending order
    .map(op => op.get('opId'))
}

function getNext(opSet, objectId, key) {
  const children = insertionsAfter(opSet, objectId, key)
  if (!children.isEmpty()) return children.first()

  let ancestor
  while (true) {
    ancestor = getParent(opSet, objectId, key)
    if (!ancestor) return
    const siblings = insertionsAfter(opSet, objectId, ancestor, key)
    if (!siblings.isEmpty()) return siblings.first()
    key = ancestor
  }
}

// Given the ID of a list element, returns the ID of the immediate predecessor list element,
// or null if the given list element is at the head.
function getPrevious(opSet, objectId, key) {
  const parentId = getParent(opSet, objectId, key)
  let children = insertionsAfter(opSet, objectId, parentId)
  if (children.first() === key) {
    if (parentId === '_head') return null; else return parentId
  }

  let prevId
  for (let child of children) {
    if (child === key) break
    prevId = child
  }
  while (true) {
    children = insertionsAfter(opSet, objectId, prevId)
    if (children.isEmpty()) return prevId
    prevId = children.last()
  }
}

function constructField(opSet, op) {
  if (isChildOp(op)) {
    return constructObject(opSet, getChildId(op))
  } else if (op.get('action') === 'set') {
    const result = {value: op.get('value')}
    if (op.get('datatype')) result.datatype = op.get('datatype')
    return result
  } else {
    throw new TypeError(`Unexpected operation action: ${op.get('action')}`)
  }
}

function constructMap(opSet, objectId, type) {
  const patch = {objectId, type, props: {}}
  for (let [key, fieldOps] of opSet.getIn(['byObject', objectId, '_keys']).entries()) {
    if (!fieldOps.isEmpty()) {
      patch.props[key] = {}
      for (let op of fieldOps) {
        patch.props[key][op.get('opId')] = constructField(opSet, op)
      }
    }
  }
  return patch
}

function constructList(opSet, objectId, type) {
  const patch = {objectId, type, props: {}, edits: []}
  let elemId = '_head', index = 0, maxCounter = 0

  while (true) {
    elemId = getNext(opSet, objectId, elemId)
    if (!elemId) {
      return patch
    }
    maxCounter = Math.max(maxCounter, parseOpId(elemId).counter)

    const fieldOps = getFieldOps(opSet, objectId, elemId)
    if (!fieldOps.isEmpty()) {
      patch.props[index] = {}
      for (let op of fieldOps) {
        patch.props[index][op.get('opId')] = constructField(opSet, op)
      }
      index += 1
    }
  }
}

function constructObject(opSet, objectId) {
  const type = getObjectType(opSet, objectId)
  if (type === 'map' || type === 'table') {
    return constructMap(opSet, objectId, type)
  } else if (type === 'list' || type === 'text') {
    return constructList(opSet, objectId, type)
  } else {
    throw new RangeError(`Unknown object type: ${type}`)
  }
}

module.exports = {
  init, addChange, addLocalChange, getHeads,
  getChangeByHash, getMissingChanges, getChangesAdded, getMissingDeps,
  constructObject, getFieldOps, getOperationKey, finalizePatch
}
