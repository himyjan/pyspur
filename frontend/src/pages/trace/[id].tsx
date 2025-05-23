import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import TraceCanvas from '@/components/canvas/TraceCanvas'
import { RunResponse } from '@/types/api_types/runSchemas'
import { WorkflowDefinition } from '@/types/api_types/workflowSchemas'

import Header from '../../components/Header'
import LoadingSpinner from '../../components/LoadingSpinner'
import { setTestInputs } from '../../store/flowSlice'
import { fetchNodeTypes } from '../../store/nodeTypesSlice'
import { AppDispatch, RootState, persistor } from '../../store/store'
import { getRunStatus } from '../../utils/api'
import { rolloutWorkflowDefinition } from '../../utils/subworkflowUtils'

const TracePage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const router = useRouter()
    const { id } = router.query
    const [runData, setRunData] = useState<RunResponse | null>(null)
    const [workflowId, setWorkflowId] = useState<string | null>(null)
    const [workflowData, setWorkflowData] = useState<{
        name: string
        definition: WorkflowDefinition
    } | null>(null)
    const [handleDownloadImage, setHandleDownloadImage] = useState<(() => void) | undefined>()
    const [tasksData, setTasksData] = useState<any[]>([])
    const projectName = useSelector((state: RootState) => state.flow.projectName)

    useEffect(() => {
        dispatch(fetchNodeTypes())
        const fetchRun = async () => {
            try {
                if (typeof id !== 'string') return
                const data = await getRunStatus(id)
                setWorkflowId(data.workflow_id)
                setRunData(data)

                if (data.workflow_version?.definition) {
                    dispatch(setTestInputs(data.workflow_version.definition.test_inputs))

                    // Roll out the workflow definition if tasks are available
                    const { rolledOutDefinition } = data.tasks
                        ? rolloutWorkflowDefinition({
                              workflowDefinition: data.workflow_version.definition,
                              tasks: data.tasks,
                          })
                        : {
                              rolledOutDefinition: data.workflow_version.definition,
                          }

                    setWorkflowData({
                        name: data.workflow_version.name,
                        definition: rolledOutDefinition,
                    })

                    // Store tasks data to pass to RunViewFlowCanvas
                    if (data.tasks) {
                        setTasksData(data.tasks)
                    }
                }
            } catch (error) {
                console.error('Error fetching run:', error)
            }
        }

        if (id) {
            fetchRun()
        }
    }, [id, dispatch])

    if (!workflowData) {
        return <LoadingSpinner />
    }

    return (
        <PersistGate loading={null} persistor={persistor}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header
                    activePage="trace"
                    associatedWorkflowId={workflowId}
                    runId={id as string}
                    handleDownloadImage={handleDownloadImage}
                />
                <div style={{ flexGrow: 1 }}>
                    <TraceCanvas
                        workflowData={workflowData}
                        workflowID={workflowId}
                        tasksData={tasksData}
                        onDownloadImageInit={(handler) => setHandleDownloadImage(() => handler)}
                        projectName={projectName}
                    />
                </div>
            </div>
        </PersistGate>
    )
}

export default TracePage
