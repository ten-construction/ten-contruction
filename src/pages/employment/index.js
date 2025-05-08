import TableData from "../../component/TableData";
import { formatYmdHisGmt7, millisecondsGmt7 } from "../../lib/TimeHelper";
import { toRupiahFormat } from "../../lib/IntegerHelper";
import { LoadingOutlined } from '@ant-design/icons';

import { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, message, Spin} from 'antd';

import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

function Employment(){
    const [employments, setEmployments] = useState([]);
    const [modal2Open, setModal2Open] = useState(false);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [isSaveEmploymentProcess, setIsSaveEmploymentProcess] = useState(false)
  
    const [loading, setLoading] = useState(false)

    const [isUpdate, setIsUpdate] = useState(false)

    const fetchEmployments = async () => {
        setLoading(true)

        const q = query(
            collection(db, 'employments'),
            orderBy('salary', 'desc')
        )
        const querySnapshot = await getDocs(q);
        
        const employmentsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nama: doc.data().name, 
            gaji: toRupiahFormat(doc.data().salary),
            salary_integer: doc.data().salary,
            tanggal_dibuat: formatYmdHisGmt7(doc.data().created_at.seconds), 
            tanggal_diupdate: formatYmdHisGmt7(doc.data().updated_at.seconds),
            created_at_mili_seconds: millisecondsGmt7(doc.data().created_at.seconds),
            updated_at_mili_seconds: formatYmdHisGmt7(doc.data().updated_at.seconds)
        }));
        
        setEmployments(employmentsList);
        setLoading(false)
    };

    useEffect(() => {
        fetchEmployments();
    }, [])

    const error = (content) => {
      messageApi.open({
        type: 'error',
        content: content,
      });
    };
    
    const handleDelete = async (employmentId) => {
        try {
            await deleteDoc(doc(db, 'employments', employmentId));
            
            // Refetch projects to refresh table
            fetchEmployments();
            
            messageApi.success('Pekerjaan berhasil di hapus!');
        } catch (error) {
            error('Gagal menghapus pekerjaan: ' + error);
        }
    };

    const onFinish = async (values) => {
        const now = new Date();
        setIsSaveEmploymentProcess(true)

        try {
            if (values.id !== undefined) {
                // Update existing employment
                const employmentRef = doc(db, 'employments', values.id)
                
                const employmentData = await getDoc(employmentRef);
                if (!employmentData.exists()) {
                    error(`Pekerjaan '${values.name}' tidak dapat ditemukan, tidak dapat mengubah!`);
                    setIsSaveEmploymentProcess(false)
                    return;
                }

                // Check duplicate project name
                if (employments.map(itm => itm.nama).filter(itm => itm !== employmentData.data().name).indexOf(values.name) >= 0) {
                    error(`Pekerjaan '${values.name}' sudah ada, mohon masukan nama pekerjaan lain`);
                    setIsSaveEmploymentProcess(false)
                    return;
                }

                await updateDoc(employmentRef, {
                    name: values.name,
                    salary: values.salary,
                    updated_at: now
                });
            }else{
                // Check duplicate project name
                if (employments.map(itm => itm.nama).indexOf(values.name) >= 0) {
                    error(`Pekerjaan '${values.name}' sudah ada, mohon masukan nama pekerjaan lain`);
                    setIsSaveEmploymentProcess(false)
                    return;
                }

                // Add new employment
                await addDoc(collection(db, "employments"), {
                    name: values.name,
                    salary: values.salary,
                    created_at: now,
                    updated_at: now
                });
            }

            // Refetch employments to refresh table
            fetchEmployments();

            form.resetFields();
            setModal2Open(false);

            messageApi.success('Berhasil menambahkan pekerjaan!');
        } catch (err) {
            console.log(err);
            setIsSaveEmploymentProcess(false)
            error('Gagal menambahkan pekerjaan : ' + err);
        }

        setIsSaveEmploymentProcess(false)
    };

    const handleUpdate = async (record) => {
        setIsUpdate(true)

        form.setFieldsValue({
            id: record.id,
            name: record.nama,
            salary: record.salary_integer
        });
        
        setModal2Open(true)
    }

    const handleInsertPopup = () => {
        setIsUpdate(false)
        form.resetFields()
        setModal2Open(true)
    }

    return (
        <>
            {contextHolder}

            <Button style={{marginBottom: 30}} type="primary" onClick={() => handleInsertPopup()}>
                Pekerjaan Baru
            </Button>

            <Modal
                title={isUpdate ? "Ubah Pekerjaan" : "Masukan pekerjaan baru"}
                centered
                open={modal2Open}
                onOk={() => setModal2Open(false)}
                onCancel={() => setModal2Open(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModal2Open(false)}>
                        Cancel
                    </Button>,
                    <>
                        {isSaveEmploymentProcess && 
                            <Button disabled key="submit" type="primary" onClick={() => form.submit()}>
                                <Spin indicator={<LoadingOutlined spin />} />
                            </Button>
                        }
                        {!isSaveEmploymentProcess && 
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
                    wrapperCol={{ span: 16 }}
                    style={{ maxWidth: 600 }}
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item name="id" style={{ display: 'none' }}>
                        <Input type="hidden" />
                    </Form.Item>

                    <Form.Item
                        label="Nama Pekerjaan"
                        name="name"
                        rules={[{ required: true, message: 'Mohon masukan nama pekerjaan!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Gaji"
                        name="salary"
                        rules={[{ required: true, message: 'Mohon masukan gaji!' }]}
                    >
                        <InputNumber style={{ width: '100%' }}/>
                    </Form.Item>
                </Form>
            </Modal>
            
            <TableData 
                dataSource={employments} 
                columns={['nama', 'gaji', 'tanggal_dibuat', 'tanggal_diupdate']}
                handleDeleteProp={handleDelete}
                loading={loading}
                handleUpdateProp={handleUpdate}
            />
        </>
    )
}

export default Employment;