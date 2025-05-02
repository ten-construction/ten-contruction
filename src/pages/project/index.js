import TableData from "../../component/TableData";
import { formatYmdHisGmt7, millisecondsGmt7 } from "../../lib/TimeHelper";
import { LoadingOutlined } from '@ant-design/icons';

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, message, Spin} from 'antd';

import { collection, getDocs, addDoc, deleteDoc, doc, where, query } from "firebase/firestore";
import { db } from "../../lib/firebase";

function Project(){
    const [projects, setProjects] = useState([]);
    const [modal2Open, setModal2Open] = useState(false);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [isSaveProjectProcess, setIsSaveProjectProcess] = useState(false)
  
    const [loading, setLoading] = useState(false)

    const fetchProjects = async () => {
        setLoading(true)

        const querySnapshot = await getDocs(collection(db, "projects"));
        
        const projectList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nama: doc.data().name, 
            tanggal_dibuat: formatYmdHisGmt7(doc.data().created_at.seconds), 
            tanggal_diupdate: formatYmdHisGmt7(doc.data().updated_at.seconds),
            created_at_mili_seconds: millisecondsGmt7(doc.data().created_at.seconds),
            updated_at_mili_seconds: formatYmdHisGmt7(doc.data().updated_at.seconds)
        }));
        
        setProjects(projectList);
        setLoading(false)
    };

    useEffect(() => {
        fetchProjects();
    }, [])

    const error = (content) => {
      messageApi.open({
        type: 'error',
        content: content,
      });
    };

    const onFinish = async (values) => {
        const now = new Date();
        setIsSaveProjectProcess(true)

        try {
            // Check duplicate project name
            if (projects.map(itm => itm.nama).indexOf(values.name) >= 0) {
                error(`Projek '${values.name} sudah ada', mohon masukan nama projek lain`);
                setIsSaveProjectProcess(false)
                return;
            }

            // Add new project into Firestore
            await addDoc(collection(db, "projects"), {
                name: values.name,
                created_at: now,
                updated_at: now
            });

            // Refetch projects to refresh table
            fetchProjects();

            form.resetFields();
            setModal2Open(false);

            messageApi.success('Projek berhasil ditambah!');
        } catch (err) {
            console.error(err);
            error('Gagal menambahkan projek!');
            setIsSaveProjectProcess(false)
        }

        setIsSaveProjectProcess(false)
    };

    const handleDelete = async (projectId) => {
        try {
            const projectRef = doc(db, 'projects', projectId)

            const q = query(
                collection(db, 'user_project_mandays'),
                where('project_id', '==', projectRef),
            )

            const absenceSnap = await getDocs(q)
            for (const document of absenceSnap.docs) {
                const absenceRef = doc(db, 'user_project_mandays', document.id)

                const qLogs = query(
                    collection(db, 'user_project_manday_logs'),
                    where('user_project_manday_id', '==', absenceRef),
                )
            
                const absenceLogSnap = await getDocs(qLogs)
                for (const document of absenceLogSnap.docs) {
                    await deleteDoc(doc(db, 'user_project_manday_logs', document.id));
                }   

                await deleteDoc(absenceRef);
            } 


            await deleteDoc(projectRef);

            fetchProjects();
            
            messageApi.success('Projek berhasil dihapus!');
        } catch (error) {
            error('Gagal menghapus projek:', error);
        }
    };

    return (
        <>
            {contextHolder}

            <Button style={{marginBottom: 30}} type="primary" onClick={() => setModal2Open(true)}>
                Projek Baru
            </Button>

            <Modal
                title="Masukan Projek Baru"
                centered
                open={modal2Open}
                onOk={() => setModal2Open(false)}
                onCancel={() => setModal2Open(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModal2Open(false)}>
                        Cancel
                    </Button>,
                    <>
                        {isSaveProjectProcess && 
                            <Button disabled key="submit" type="primary" onClick={() => form.submit()}>
                                <Spin indicator={<LoadingOutlined spin />} />
                            </Button>
                        }
                        {!isSaveProjectProcess && 
                            <Button key="submit" type="primary" onClick={() => form.submit()}>
                                Submit
                            </Button>
                        }
                    </>
                ]}
            >
                <Form
                    form={form}
                    name="basic"
                    style={{ maxWidth: 600, marginTop: 40, marginBottom: 40 }}
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item
                        label="Nama Projek"
                        name="name"
                        rules={[{ required: true, message: 'Mohon masukan nama projek!' }]}
                        style={{width: '100%'}}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
            
            <TableData 
                dataSource={projects} 
                columns={['nama', 'tanggal_dibuat', 'tanggal_diupdate']}
                handleDeleteProp={handleDelete}
                popUpConfirmMessage="Menghapus data projek ini akan menghapus data absensi projek juga, yakin ingin hapus?"
                loading={loading}
            />
        </>
    )
}

export default Project;