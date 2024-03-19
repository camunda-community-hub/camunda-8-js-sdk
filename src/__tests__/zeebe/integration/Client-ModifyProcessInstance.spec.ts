import { restoreZeebeLogging, suppressZeebeLogging } from 'lib'

import { ZeebeGrpcClient } from '../../../zeebe/index'
import { cancelProcesses } from '../../../zeebe/lib/cancelProcesses'

suppressZeebeLogging()

const zbc = new ZeebeGrpcClient()
let pid: string
let processModelId: string

beforeAll(async () => {
	const res = await zbc.deployResource({
		processFilename: './src/__tests__/testdata/Client-SkipFirstTask.bpmn',
	})
	processModelId = res.deployments[0].process.bpmnProcessId
})
afterAll(async () => {
	zbc.cancelProcessInstance(pid).catch((_) => _)
	await zbc.close()
	restoreZeebeLogging()
	await cancelProcesses(processModelId)
})

test('Modify Process Instance', (done) => {
	zbc.deployResource({
		processFilename: './src/__tests__/testdata/Client-SkipFirstTask.bpmn',
	})
	zbc.createWorker({
		taskType: 'second_service_task',
		taskHandler: (job) => {
			expect(job.variables.second).toBe(1)
			return job.complete().then(() => done())
		},
	})
	zbc
		.createProcessInstance({
			bpmnProcessId: 'SkipFirstTask',
			variables: {},
		})
		.then((res) => {
			pid = res.processInstanceKey
			zbc.modifyProcessInstance({
				processInstanceKey: res.processInstanceKey,
				activateInstructions: [
					{
						elementId: 'second_service_task',
						ancestorElementInstanceKey: '-1',
						variableInstructions: [
							{
								scopeId: '',
								variables: { second: 1 },
							},
						],
					},
				],
			})
		})
})
