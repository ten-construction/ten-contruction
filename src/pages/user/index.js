import TableData from "../../component/TableData";
import { formatYmdHisGmt7, millisecondsGmt7 } from "../../lib/TimeHelper";
import { toRupiahFormat } from "../../lib/IntegerHelper";
import { LoadingOutlined } from '@ant-design/icons';

import { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, message, Select, Spin} from 'antd';

import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, query, where, updateDoc } from "firebase/firestore";
import { db, storage, ref, uploadBytes, getDownloadURL } from "../../lib/firebase";

const { Option } = Select;

function User(){
    const [users, setUsers] = useState([]);
    const [employment, setEmployment] = useState([]);
    const [form] = Form.useForm();
    const [isSaveUserProcess, setIsSaveUserProcess] = useState(false)
    
    // For modal
    const [modal2Open, setModal2Open] = useState(false);

    // For popup notification
    const [messageApi, contextHolder] = message.useMessage();

    // For Upload
    const [fileList, setFileList] = useState([])

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchUsers();
        fetchEmployments();
    }, [])

    const fetchUsers = async () => {
        setLoading(true)

        const querySnapshot = await getDocs(collection(db, "users"));

        let userLists = []
        for (const doc of querySnapshot.docs) {
            let employmentName = ''
            let employmentSalary = 0

            const employmentData = await getDoc(doc.data().employment_id)
            if (employmentData.exists()) {
                employmentName = employmentData.data().name
                employmentSalary = employmentData.data().salary
            }

            userLists.push({
                id: doc.id,
                nama: doc.data().name, 
                umur: doc.data().age, 
                alamat: doc.data().address, 
                pekerjaan: employmentName, 
                gaji: toRupiahFormat(employmentSalary), 
                salary_integer: employmentSalary, 
                tanggal_dibuat: formatYmdHisGmt7(doc.data().created_at.seconds), 
                tanggal_diupdate: formatYmdHisGmt7(doc.data().updated_at.seconds),
                created_at_mili_seconds: millisecondsGmt7(doc.data().created_at.seconds),
                updated_at_mili_seconds: formatYmdHisGmt7(doc.data().updated_at.seconds)
            })
        }
        
        setUsers(userLists);
        setLoading(false)
    };

    const fetchEmployments = async () => {
        const querySnapshot = await getDocs(collection(db, "employments"));
        const employmentLists = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, salary: doc.data().salary }));
        setEmployment(employmentLists);
    };

    const error = (content) => {
      messageApi.open({
        type: 'error',
        content: content,
      });
    };
    
    const handleDelete = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId)
            
            const q = query(
                collection(db, 'user_project_mandays'),
                where('user_id', '==', userRef),
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
            
            const qAbsenceTotal = query(
                collection(db, 'user_project_mandays_total'),
                where('user_id', '==', userRef),
            )

            const absenceTotalSnap = await getDocs(qAbsenceTotal)
            for (const item of absenceTotalSnap.docs) {
                await deleteDoc(doc(db, 'user_project_mandays_total', item.id));
            } 

            await deleteDoc(userRef);
            
            fetchUsers();
            
            messageApi.success('Berhasil menghapus user!');
        } catch (err) {
            error('Gagal menghapus user: ' + err);
        }
    };

    const onFinish = async (values) => {
        const now = new Date();
        setIsSaveUserProcess(true)

        try {
            // Check duplicate project name
            if (users.map(itm => itm.nama).indexOf(values.name) >= 0) {
                error(`User '${values.name} sudah ada', mohon masukan nama lain`);
                setIsSaveUserProcess(false)
                return;
            }
            
            const employmentRef = doc(db, 'employments', values.employment);
            const employmentSnap = await getDoc(employmentRef)
            if (!employmentSnap.exists()) {
                error(`Pekerjaan '${values.name} tidak ada', mohon buat terlebih dahulu`);
                setIsSaveUserProcess(false)
                return;
            }
            
            // Add new project into Firestore
            await addDoc(collection(db, "users"), {
                name: values.name,
                age: values.age ?? '',
                address: values.address ?? '',
                employment_id: employmentRef,
                created_at: now,
                updated_at: now
            });

            // Refetch employments to refresh table
            fetchUsers();

            form.resetFields();
            setModal2Open(false);

            messageApi.success('Berhasil menambahkan user!');
        } catch (err) {
            console.log(err);
            error('Gagal menambahkan user : ' + err);
            setIsSaveUserProcess(false)
        }

        setIsSaveUserProcess(false)
    };

    const handleUpload = async ({ file, onSuccess, onError }) => {
        console.log(file);
        
        const storageRef = ref(storage, `images/${file.name}`)
        
        try {
            const snapshot = await uploadBytes(storageRef, file)
            const url = await getDownloadURL(snapshot.ref)

            setFileList([
                {
                    uid: file.uid,
                    name: file.name,
                    status: 'done',
                    url,
                },
            ])

            message.success(`${file.name} berhasil diunggah!`)
            onSuccess(null, file)
        } catch (error) {
            message.error(`${file.name} gagal diunggah.`)
            onError(error)
        }
    }

    const handleUpdateEmployment = async (employment_id, user_id) => {
        try {
            const employmentRef = doc(db, 'employments', employment_id);
    
            const userRef = doc(db, 'users', user_id);
            await updateDoc(userRef, {
              employment_id: employmentRef
            });

            fetchUsers()

            message.success(`berhasil melakukan perubahan!`)
        } catch (error) {
            message.error(`gagal melakukan perubahan.`)
        }
    }
    
    return (
        <>
            {contextHolder}
            <Button style={{marginBottom: 30}} type="primary" onClick={() => setModal2Open(true)}>
                User Baru
            </Button>
            <Modal
                title="Masukan user baru"
                centered
                open={modal2Open}
                onOk={() => setModal2Open(false)}
                onCancel={() => setModal2Open(false)}
                footer={[
                    <Button key="cancel" onClick={() => setModal2Open(false)}>
                        Cancel
                    </Button>,
                    <>
                        {isSaveUserProcess && 
                            <Button disabled key="submit" type="primary" onClick={() => form.submit()}>
                                <Spin indicator={<LoadingOutlined spin />} />
                            </Button>
                        }
                        {!isSaveUserProcess && 
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
                    style={{ maxWidth: 600, marginTop: 40, marginBottom:40 }}
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item
                        label="Nama"
                        name="name"
                        rules={[{ required: true, message: 'Mohon masukan nama!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Umur"
                        name="age"
                        rules={[{ required: false, message: 'Mohon masukan Umur!' }]}
                    >
                        <InputNumber style={{ width: '100%' }}/>
                    </Form.Item>
                    <Form.Item
                        label="Alamat"
                        name="address"
                        rules={[{ required: false, message: 'Mohon masukan Tanggal!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="employment" label="Employment" rules={[{ required: true }]}>
                        <Select placeholder="Pilih Pekerjaan">
                            {
                                employment.map(itm => {
                                    return (
                                        <Option value={itm.id}>{itm.name} ({toRupiahFormat(itm.salary)})</Option>
                                    )
                                })
                            }
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
            
            <TableData 
                dataSource={users} 
                columns={['nama', 'umur', 'alamat', 'pekerjaan', 'gaji']}
                handleDeleteProp={handleDelete}
                popUpConfirmMessage="Menghapus data user ini akan menghapus data absensi user juga, yakin ingin hapus?"
                handleUploadProp={handleUpload}
                fileList={fileList}
                handleUpdateEmploymentProp={handleUpdateEmployment}
                employmentData={employment}
                loading={loading}
            />
        </>
    )
}

export default User;