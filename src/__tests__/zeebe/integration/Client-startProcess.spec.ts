import { restoreZeebeLogging, suppressZeebeLogging } from 'lib'

import { ZeebeGrpcClient } from '../../../zeebe'
import { cancelProcesses } from '../../../zeebe/lib/cancelProcesses'
import { CreateProcessInstanceResponse } from '../../../zeebe/lib/interfaces-grpc-1.0'

process.env.ZEEBE_NODE_LOG_LEVEL = process.env.ZEEBE_NODE_LOG_LEVEL || 'NONE'
jest.setTimeout(30000)

suppressZeebeLogging()

let zbc = new ZeebeGrpcClient()
let wf: CreateProcessInstanceResponse
let id: string | null
let processId: string
let processId2: string

beforeAll(async () => {
	const res = await zbc.deployResource({
		processFilename: './src/__tests__/testdata/hello-world.bpmn',
	})
	processId = res.deployments[0].process.bpmnProcessId
	processId2 = (
		await zbc.deployResource({
			processFilename: './src/__tests__/testdata/Client-SkipFirstTask.bpmn',
		})
	).deployments[0].process.bpmnProcessId
	await cancelProcesses(processId)
	await cancelProcesses(processId2)
	await zbc.close()
})

beforeEach(() => {
	zbc = new ZeebeGrpcClient()
})

afterEach(async () => {
	if (id) {
		await zbc.cancelProcessInstance(id).catch((_) => _)
		id = null
	}
	await zbc.close()
})

afterAll(async () => {
	if (id) {
		zbc.cancelProcessInstance(id).catch((_) => _)
		id = null
	}
	await zbc.close() // Makes sure we don't forget to close connection
	restoreZeebeLogging()
	await cancelProcesses(processId)
	await cancelProcesses(processId)
})

test('Can start a process', async () => {
	wf = await zbc.createProcessInstance({
		bpmnProcessId: processId,
		variables: {},
	})
	await zbc.cancelProcessInstance(wf.processInstanceKey)
	expect(wf.bpmnProcessId).toBe(processId)
	expect(wf.processInstanceKey).toBeTruthy()
})

test('Can start a process at an arbitrary point', (done) => {
	const random = Math.random()
	const worker = zbc.createWorker({
		taskType: 'second_service_task',
		taskHandler: (job) => {
			expect(job.variables.id).toBe(random)
			return job.complete().then(finish)
		},
	})
	const finish = () => worker.close().then(() => done())
	zbc
		.createProcessInstance({
			bpmnProcessId: 'SkipFirstTask',
			variables: { id: random },
			startInstructions: [{ elementId: 'second_service_task' }],
		})
		.then((res) => (id = res.processInstanceKey))
})
