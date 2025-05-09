
import TableData from "../../component/TableData";
import { formatYmdHisGmt7, millisecondsGmt7, isToday, getFormattedDate, getMondaySaturday, getTodayStartEndDate } from "../../lib/TimeHelper";
import { toRupiahFormat } from "../../lib/IntegerHelper";
import { LoadingOutlined } from '@ant-design/icons';

import { useEffect, useState } from "react";
import { Button, Form, Select, message, Modal, Spin, Checkbox} from 'antd';

import { collection, getDocs, doc, addDoc, getDoc, where, query, updateDoc, deleteDoc, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const { Option } = Select;

function Dashboard(){
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectMandays, setProjectMandays] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal2Open, setModal2Open] = useState(false);
  const [absenceDetail, setAbsenceDetail] = useState([])
  
  const [isSaveAbsenceOnProcess, setIsSaveAbsenceOnProcess] = useState(false)
  const [isExportProcess, setIsExportProcess] = useState(false)
  const [isPurgeProcess, setIsPurgeProsess] = useState(false)
  
  const [loading, setLoading] = useState(false)

  const [form] = Form.useForm();
  const [formProject] = Form.useForm();
  
  useEffect(() => {
      fetchUsers();
      fetchProjects();
  }, [])

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const userLists = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    setUsers(userLists);
  };

  const fetchProjects = async () => {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const projectsLists = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    setProjects(projectsLists);
  };

  const fetchUserProjectManday = async (project_id) => {
    setLoading(true)

    const q = query(
      collection(db, 'user_project_mandays'),
      where('project_id', '==', doc(db, 'projects', project_id))
    )
    const querySnapshot = await getDocs(q)

    let absenceProjects = []
    for (let index = 0; index < querySnapshot.docs.length; index++) {
      const doc = querySnapshot.docs[index];
      
      const userData = await getDoc(doc.data().user_id)
      const projectData = await getDoc(doc.data().project_id)
      
      let employmentData = {}
      if (userData) {
        employmentData = await getDoc(userData.data().employment_id)
      }

      absenceProjects.push({
        no: index + 1,
        id: doc.id,
        project: projectData.data().name,
        user: userData.data().name,
        hari: doc.data().total_mandays,
        gaji: toRupiahFormat(employmentData.data().salary), 
        salary_integer: employmentData.data().salary, 
        tanggal_dibuat: formatYmdHisGmt7(doc.data().created_at.seconds), 
        tanggal_diupdate: formatYmdHisGmt7(doc.data().updated_at.seconds),
        created_at_mili_seconds: millisecondsGmt7(doc.data().created_at.seconds),
        updated_at_mili_seconds: formatYmdHisGmt7(doc.data().updated_at.seconds)
      })
    }

    setProjectMandays(absenceProjects)
    setLoading(false)
  }

  const onChangeProjectView = (projectId) => {
    fetchUserProjectManday(projectId)
  }

  const error = (content) => {
    messageApi.open({
      type: 'error',
      content: content,
    });
  };

  const onFinish = async values => {
    setIsSaveAbsenceOnProcess(true)

    const inputHari = values.hari ? 0.5 : 1

    const now = new Date();
    const { startOfDay, endOfDay } = getTodayStartEndDate()
    
    const projectValue = form.getFieldValue('project');
    const overrideValue = form.getFieldValue('override');
    
    try {
        let action = 'ditambah'
        const userRef = doc(db, 'users', values.user);
        const projectRef = doc(db, 'projects', values.project);
        
        const userSnap = await getDoc(userRef)
        if (!userSnap.exists()) {
            error(`User '${values.user} tidak ditemukan', mohon buat terlebih dahulu!`);
            setIsSaveAbsenceOnProcess(false)
            return;
        }

        const projectSnap = await getDoc(projectRef)
        if (!projectSnap.exists()) {
            error(`Project '${values.project} tidak ditemukan', mohon buat terlebih dahulu!`);
            setIsSaveAbsenceOnProcess(false)
            return;
        }

        const employmentSnap = await getDoc(userSnap.data().employment_id)
        if (!employmentSnap.exists()) {
            error(`Pekerjaan pada user '${values.user} tidak ditemukan', mohon buat terlebih dahulu!`);
            setIsSaveAbsenceOnProcess(false)
            return;
        }

        // [BEGIN] Validate user mandays not > 1
        let totalMandays = inputHari

        const qValidateMandays = query(
          collection(db, "user_project_manday_logs"),
          where('user_id', '==', userRef),
          where('created_at', '>=', Timestamp.fromDate(new Date(startOfDay))),
          where('created_at', '<=', Timestamp.fromDate(new Date(endOfDay)))
        )
        
        const absenceMandaysValidation = await getDocs(qValidateMandays)
        for (const validation of absenceMandaysValidation.docs) {
          totalMandays += parseFloat(validation.data().total_mandays)
        }

        if (totalMandays > 1 && (values.override === false || values.override === undefined)) {
          error("Total hari kerja hari ini tidak boleh melebihi 1.")
          setIsSaveAbsenceOnProcess(false)
          return
        }
        // [END] Validate user mandays not > 1

        const q = query(
          collection(db, "user_project_mandays"),
          where('project_id', '==', projectRef),
          where('user_id', '==', userRef)
        )

        const absenceSnapshot = await getDocs(q)
        let absenceIdSnap = '';

        if (absenceSnapshot.docs.length > 0) {  
          action = 'diubah'
          for (const document of absenceSnapshot.docs) {
            // if (isToday(document.data().updated_at.seconds)) {
            //   error("User telah melakukan absensi hari ini.")
            //   return
            // }

            absenceIdSnap = document.id
            
            await updateDoc(
              doc(db, "user_project_mandays", document.id),
              {
                total_mandays: document.data().total_mandays + inputHari,
                salary: (document.data().total_mandays + inputHari) * parseInt(employmentSnap.data().salary),
                updated_at: now
              }
            )
          }
        }else{
          const absenceAdd = await addDoc(collection(db, "user_project_mandays"), {
              project_id: projectRef,
              user_id: userRef,
              total_mandays: inputHari,
              salary: inputHari * parseInt(employmentSnap.data().salary),
              created_at: now,
              updated_at: now
          });

          absenceIdSnap = absenceAdd.id
        }
        
        // Add user project manday logs into Firestore
        const absenceRef = doc(db, 'user_project_mandays', absenceIdSnap)
        await addDoc(collection(db, "user_project_manday_logs"), {
            user_project_manday_id: absenceRef,
            project_id: projectRef,
            total_mandays: inputHari,
            salary: inputHari * parseInt(employmentSnap.data().salary),
            user_id: userRef,
            created_at: now,
        });

        // Create or update absence total
        let userMandaysTotal = 0

        const qAbsenceTotal = query(
          collection(db, "user_project_mandays_total"),
          where('user_id', '==', userRef)
        )
        
        const absenceTotalSnap = await getDocs(qAbsenceTotal)
        if (absenceTotalSnap.docs.length) {
          for (const item of absenceTotalSnap.docs) {
            await updateDoc(
              doc(db, "user_project_mandays_total", item.id),
              {
                total_mandays: parseFloat(item.data().total_mandays) + inputHari,
                updated_at: now
              }
            )
          }
        }else{
          await addDoc(collection(db, "user_project_mandays_total"), {
            user_id: userRef,
            total_mandays: inputHari,
            salary: employmentSnap.data().salary,
            created_at: now,
            updated_at: now,
          });
        }

        setProjectMandays([]);
        messageApi.success(`Absence telah ${action}!`);
    } catch (err) {
        console.log(err);
        error('Gagal untuk menambah absence!');
    } finally {
      form.resetFields();
      form.setFieldsValue({ 
        project: projectValue,
        override: overrideValue
      });

      formProject.resetFields(['seeProject'])

      setIsSaveAbsenceOnProcess(false)
    }
  };

  const handleDelete = async (userProjectMandayId) => {
    const now = new Date()
    const currentFormProject = formProject.getFieldsValue();

    try {
      const absenceRef = doc(db, 'user_project_mandays', userProjectMandayId)
      const absenceSnap = await getDoc(absenceRef)
      if (!absenceSnap.exists()) {
        error('Absence yang dipilih tidak ditemukan!');
        return;
      }

      // [BEGIN] Delete all absence logs
      const q = query(
        collection(db, 'user_project_manday_logs'),
        where('user_project_manday_id', '==', absenceRef),
      )

      const absenceLogSnap = await getDocs(q)      
      for (const document of absenceLogSnap.docs) {
        await deleteDoc(doc(db, 'user_project_manday_logs', document.id));
      }
      // [END] Delete all absence logs

      // [BEGIN] Substract absence total first
      const qTotal = query(
        collection(db, 'user_project_mandays_total'),
        where('user_id', '==' , absenceSnap.data().user_id)
      )
      const absenceTotalSnap = await getDocs(qTotal)

      for (const item of absenceTotalSnap.docs) {
        await updateDoc(
          doc(db, "user_project_mandays_total", item.id),
          {
            total_mandays: parseFloat(item.data().total_mandays) - parseFloat(absenceSnap.data().total_mandays),
            updated_at: now
          }
        )
      }
      // [END] Substract absence total first
      
      await deleteDoc(absenceRef);

      fetchUserProjectManday(currentFormProject.seeProject)

      messageApi.success(`Absence telah dihapus!`);
    } catch (e) {
      error(`Error deleting user: ${e}`);
    }
  }

  const handleDeleteDetail = async (userProjectMandayLogId) => {
    const now = new Date();
    
    const absenceDetailRef = doc(db, 'user_project_manday_logs', userProjectMandayLogId)
    const absenceDetailSnap = await getDoc(absenceDetailRef);
    if (!absenceDetailSnap.exists()) {
      error(`Absence detail tidak ditemukan', mohon buat terlebih dahulu`);
      return;
    }

    const userRef = absenceDetailSnap.data().user_id

    const absenceRef = absenceDetailSnap.data().user_project_manday_id
    const absenceSnap = await getDoc(absenceRef);

    if (absenceSnap.exists()) {
      const currentMandays = parseFloat(absenceSnap.data().total_mandays) - parseFloat(absenceDetailSnap.data().total_mandays)
      
      if (currentMandays <= 0) {
        await deleteDoc(absenceRef)
      }else{
        await updateDoc(
          absenceRef,
          {
            total_mandays: currentMandays,
            updated_at: now
          }
        )
      }
    }

    const qTotal = query(
      collection(db, 'user_project_mandays_total'),
      where('user_id', '==', userRef)
    )
    
    const absenceTotalSnap = await getDocs(qTotal)
    for (const item of absenceTotalSnap.docs) {
      
      await updateDoc(
        doc(db, 'user_project_mandays_total', item.id),
        {
          total_mandays: parseFloat(item.data().total_mandays) - parseFloat(absenceDetailSnap.data().total_mandays),
          updated_at: now
        }
      )
    } 

    await deleteDoc(absenceDetailRef);

    const userSnap = await getDoc(userRef)
    const projectSnap = await getDoc(absenceDetailSnap.data().project_id)

    let record = {
      id: absenceDetailSnap.data().user_project_manday_id,
      user: userSnap.exists() ? userSnap.data().name : "",
      project: projectSnap.exists() ? projectSnap.data().name : ""
    }

    await showDetail(record, true)
            
    messageApi.success('Absence detail telah dihapus!');
  }

  const showDetail = async (record, fromFunction) => {
    let absenceDetailRes = []
    let absenceRef = null;
    if (fromFunction) {
      absenceRef = record.id
    }else{
      absenceRef = doc(db, 'user_project_mandays', record.id)
    }

    const q = query(
      collection(db, 'user_project_manday_logs'),
      where('user_project_manday_id', '==', absenceRef),
    )

    const absenceLogSnap = await getDocs(q)

    for (let index = 0; index < absenceLogSnap.docs.length; index++) {
      const document = absenceLogSnap.docs[index];

      absenceDetailRes.push({
        no: index + 1,
        id: document.id,
        user: record.user,
        project: record.project,
        tanggal_dibuat: formatYmdHisGmt7(document.data().created_at.seconds), 
        created_at_mili_seconds: millisecondsGmt7(document.data().created_at.seconds),
      })
    }
    
    setAbsenceDetail(absenceDetailRes)
    setModal2Open(true)
  }

  const closeShowDetail = () => {
    setModal2Open(false)
  }

  const handleExport = async () => {
    const now = new Date();

    setIsExportProcess(true)

    try {
      let projects = {}
      const projectsSnapShot = await getDocs(collection(db, 'projects'));
      const {monday, saturday} = getMondaySaturday()

      for (const project of projectsSnapShot.docs) {
        const absenceQuery = query(
          collection(db, "user_project_mandays"),
          where('project_id', '==', doc(db, 'projects', project.id)),
          // where("created_at", ">=", monday),
          // where("created_at", "<=", saturday),
          orderBy("salary", "desc")
        );
        const absenceSnapShot = await getDocs(absenceQuery);

        if (absenceSnapShot.docs.length > 0) {
          
          projects[project.data().name] = []

          let totalSalaryProject = 0
    
          for (let index = 0; index < absenceSnapShot.docs.length; index++) {
            const item = absenceSnapShot.docs[index];

            const userSnap = await getDoc(item.data().user_id)
    
            let employment = ''
            let salary = 0
            if (userSnap.exists()) {
              const employmentSnap = await getDoc(userSnap.data().employment_id)
              salary = parseInt(employmentSnap.data().salary)
              employment = employmentSnap.data().name
            }
    
            projects[project.data().name].push({
              no: index + 1,
              nama: userSnap.data().name,
              jabatan: employment,
              gaji: salary,
              hari: item.data().total_mandays,
              total: parseFloat(item.data().total_mandays) * salary
            })

            totalSalaryProject += (parseFloat(item.data().total_mandays) * salary)
          }

          projects[project.data().name].push({
            no: "",
            nama: "",
            jabatan: "",
            gaji: "",
            hari: "TOTAL",
            total: totalSalaryProject
          })
        }
      }
    
      const aoa = [];
      const merges = [];
      let rowIndex = 0;
    
      const headers = ["NO", "NAMA", "JABATAN", "GAJI HARIAN", "HARI KERJA", "JUMLAH"];
    
      Object.entries(projects).forEach(([projectName, records]) => {
        // Add merged title row
        aoa.push([projectName]);
        merges.push({
          s: { r: rowIndex, c: 0 },
          e: { r: rowIndex, c: headers.length - 1 },
        });
        rowIndex++;
    
        // Add header row for each project
        aoa.push(headers);
        rowIndex++;
    
        // Add data rows
        records.forEach((record) => {
          aoa.push([
            record.no,
            record.nama, 
            record.jabatan, 
            {
              v: record.gaji, // actual number value
              t: 'n',     // type number
              z: '"Rp" #,##0' // currency format
            },
            record.hari, 
            {
              v: record.total, // actual number value
              t: 'n',     // type number
              z: '"Rp" #,##0' // currency format
            }
          ]);
          rowIndex++;
        });
    
        // Add empty row for spacing
        aoa.push([]);
        rowIndex++;
      });
    
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      worksheet["!merges"] = merges;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Absence");

      // [BEGIN] Get master data
      // let usersData = []
      // const usersSnap = await getDocs(collection(db, 'users'))
      // for (const user of usersSnap.docs) {
      //   const employmentSnap = await getDoc(user.data().employment_id)

      //   usersData.push({
      //     nama: user.data().name,
      //     umur: user.data().age,
      //     alamat: user.data().address,
      //     pekerjaan: employmentSnap.data().name,
      //     tanggal_dibuat: formatYmdHisGmt7(user.data().created_at.seconds), 
      //     tanggal_diupdate: formatYmdHisGmt7(user.data().updated_at.seconds),
      //   })
      // }

      // const projectsData = (await getDocs(collection(db, 'projects'))).docs.map(itm => ({
      //   nama: itm.data().name,
      //   gaji: itm.data().salary,
      //   tanggal_dibuat: formatYmdHisGmt7(itm.data().created_at.seconds), 
      //   tanggal_diupdate: formatYmdHisGmt7(itm.data().updated_at.seconds),
      // }))
      
      // const employmentsData = (await getDocs(collection(db, 'employments'))).docs.map(itm => ({
      //   nama: itm.data().name,
      //   tanggal_dibuat: formatYmdHisGmt7(itm.data().created_at.seconds), 
      //   tanggal_diupdate: formatYmdHisGmt7(itm.data().updated_at.seconds),
      // }))

      // [END] Get master data

      // [BEGIN] Get Project Total
      const absenceTotalQuery = query(
        collection(db, "user_project_mandays_total"),
        // where("created_at", ">=", monday),
        // where("created_at", "<=", saturday),
        orderBy("salary", "desc")
      );

      let absenceTotalData = []
      let absenceTotalSalary = 0
      const absenceTotalSnap = await getDocs(absenceTotalQuery)

      for (let index = 0; index < absenceTotalSnap.docs.length; index++) {
        const absenceTotal = absenceTotalSnap.docs[index];

        const userSnap = await getDoc(absenceTotal.data().user_id)
    
        let employment = ''
        if (userSnap.exists()) {
          const employmentSnap = await getDoc(userSnap.data().employment_id)
          employment = employmentSnap.data().name
        }

        absenceTotalData.push({
          "NO": index + 1,
          "NAMA": userSnap.data().name,
          "JABATAN" : employment,
          "GAJI HARIAN": {
            v: absenceTotal.data().salary, // actual number value
            t: 'n',     // type number
            z: '"Rp" #,##0' // currency format
          },
          "HARI KERJA": absenceTotal.data().total_mandays,
          "JUMLAH": {
            v: parseFloat(absenceTotal.data().total_mandays) * parseInt(absenceTotal.data().salary), // actual number value
            t: 'n',     // type number
            z: '"Rp" #,##0' // currency format
          }
        })

        absenceTotalSalary += parseFloat(absenceTotal.data().total_mandays) * parseInt(absenceTotal.data().salary)
      }

      absenceTotalData.push({
        "NO": "",
        "NAMA": "",
        "JABATAN" : "",
        "GAJI HARIAN": "",
        "HARI KERJA": "TOTAL",
        "JUMLAH": {
          v: absenceTotalSalary, // actual number value
          t: 'n',     // type number
          z: '"Rp" #,##0' // currency format
        }
      })
      // [END] Get Project Total
      
      const worksheetAbsenceTotal = XLSX.utils.json_to_sheet(absenceTotalData);
      XLSX.utils.book_append_sheet(workbook, worksheetAbsenceTotal, "Absence Total");
      
      // const worksheetUser = XLSX.utils.json_to_sheet(usersData);
      // XLSX.utils.book_append_sheet(workbook, worksheetUser, "User");

      // const worksheetProject = XLSX.utils.json_to_sheet(projectsData);
      // XLSX.utils.book_append_sheet(workbook, worksheetProject, "Project");

      // const worksheetEmployment = XLSX.utils.json_to_sheet(employmentsData);
      // XLSX.utils.book_append_sheet(workbook, worksheetEmployment, "Employment");

      // [BEGIN] Add some styles in excel
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
      
        // 1. Center alignment for all cells
        Object.keys(worksheet).forEach((cell) => {
          if (cell[0] === "!") return; // skip metadata

          if (!worksheet[cell].s) worksheet[cell].s = {};

          worksheet[cell].s.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          };

          worksheet[cell].s.alignment = {
            vertical: "center",
            horizontal: "center",
          };
        });
      
        // 2. Auto width columns
        const range = XLSX.utils.decode_range(worksheet['!ref']); 
        const columnWidths = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLength = 10; // default min width
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = { c: C, r: R };
            const cellRef = XLSX.utils.encode_cell(cellAddress);
            const cell = worksheet[cellRef];
            if (cell && cell.v) {
              const cellLength = cell.v.toString().length;
              if (cellLength > maxLength) maxLength = cellLength;
            }
          }
          columnWidths.push({ wch: maxLength + 3 }); // add padding
        }
        worksheet['!cols'] = columnWidths;
      });
      // [END] Add some styles in excel
    
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
    
      saveAs(fileData, `Absensi_${getFormattedDate()}.xlsx`);

      await addDoc(collection(db, "export_histories"), {
        created_at: now
      });

    } catch (error) {
      console.error(error);
      messageApi.error('Gagal export data!');
    } finally {
      setIsExportProcess(false)
    }
  };

  const onSelectUserEnter = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      form.submit(); 
    }
  }

  const handePurge = async () => {
    setIsPurgeProsess(true)

    let isHasExportedToday = false
    const { startOfDay, endOfDay } = getTodayStartEndDate()

    const q = query(
      collection(db, 'export_histories'),
      where('created_at', '>=', Timestamp.fromDate(new Date(startOfDay))),
      where('created_at', '<=', Timestamp.fromDate(new Date(endOfDay)))
    )
    const exportHistories = await getDocs(q);

    for (const item of exportHistories.docs) {
      isHasExportedToday = true
    }

    if (!isHasExportedToday) {
      error('Kamu belum melakukan export hari ini, mohon export terlebih dahulu!');
      setIsPurgeProsess(false)
      return;
    }

    // [BEGIN] Delete all absence and export histories data
    const absenceSnap = await getDocs(collection(db, 'user_project_mandays'))
    for (const item of absenceSnap.docs) {
        await deleteDoc(doc(db, 'user_project_mandays', item.id));
    }

    const absenceLogSnap = await getDocs(collection(db, 'user_project_manday_logs'))
    for (const item of absenceLogSnap.docs) {
        await deleteDoc(doc(db, 'user_project_manday_logs', item.id));
    }

    const absenceTotalSnap = await getDocs(collection(db, 'user_project_mandays_total'))
    for (const item of absenceTotalSnap.docs) {
        await deleteDoc(doc(db, 'user_project_mandays_total', item.id));
    }

    const exportHistorySnap = await getDocs(collection(db, 'export_histories'))
    for (const item of exportHistorySnap.docs) {
        await deleteDoc(doc(db, 'export_histories', item.id));
    }
    // [END] Delete all absence and export histories data
            
    messageApi.success('Proses purge telah selesai, data absensi telah di reset!');

    formProject.resetFields(['seeProject'])
    setProjectMandays([]);
    setIsPurgeProsess(false)
  }

  return (
    <>
      {contextHolder}

      {
        isPurgeProcess && 
        <Button disabled style={{float: 'right'}} danger variant="solid">
          Purge Data <Spin indicator={<LoadingOutlined spin />} />
        </Button>
      }
      {
        !isPurgeProcess && 
        <Button style={{float: 'right'}} danger variant="solid" onClick={() => handePurge()}>
            Purge Data
        </Button>
      }

      {
        isExportProcess && 
        <Button disabled style={{float: 'right', marginRight: 10}} color="green" variant="solid">
          Export XLSX <Spin indicator={<LoadingOutlined spin />} />
        </Button>
      }
      {
        !isExportProcess && 
        <Button style={{float: 'right', marginRight: 10}} color="green" variant="solid" onClick={() => handleExport()}>
            Export XLSX
        </Button>
      }

      <br/>
      <br/>
      <br/>

      <Form
        form={form}
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          label="User"
          name="user"
          rules={[{ required: true, message: 'Mohon pilih user!' }]}
        >
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Pilih User"
            optionFilterProp="label"
            filterSort={(optionA, optionB) => {
              var _a, _b;
              return (
                (_a = optionA === null || optionA === void 0 ? void 0 : optionA.label) !== null &&
                _a !== void 0
                  ? _a
                  : ''
              )
                .toLowerCase()
                .localeCompare(
                  ((_b = optionB === null || optionB === void 0 ? void 0 : optionB.label) !== null &&
                  _b !== void 0
                    ? _b
                    : ''
                  ).toLowerCase(),
                );
            }}
            options={users.map(itm => ({value: itm.id, label: itm.name}))}
            onInputKeyDown={onSelectUserEnter}
          />
        </Form.Item>

        <Form.Item
          label="Projek"
          name="project"
          rules={[{ required: true, message: 'Mohon pilih projek!' }]}
        >
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Pilih Projek"
            optionFilterProp="label"
            filterSort={(optionA, optionB) => {
              var _a, _b;
              return (
                (_a = optionA === null || optionA === void 0 ? void 0 : optionA.label) !== null &&
                _a !== void 0
                  ? _a
                  : ''
              )
                .toLowerCase()
                .localeCompare(
                  ((_b = optionB === null || optionB === void 0 ? void 0 : optionB.label) !== null &&
                  _b !== void 0
                    ? _b
                    : ''
                  ).toLowerCase(),
                );
            }}
            options={projects.map(itm => ({value: itm.id, label: itm.name}))}
          />
        </Form.Item>

        <Form.Item
          name="hari"
          valuePropName="checked"
        >
          <Checkbox>0.5 Hari Kerja</Checkbox>
        </Form.Item>

        <Form.Item
          name="override"
          valuePropName="checked"
        >
          <Checkbox>Override</Checkbox>
        </Form.Item>

        <Form.Item label={null}>
          {isSaveAbsenceOnProcess && 
            <Button disabled type="primary" htmlType="submit" style={{width: '100%'}}>
              <Spin indicator={<LoadingOutlined spin />} />
            </Button>
          }
          {!isSaveAbsenceOnProcess && 
            <Button type="primary" htmlType="submit" style={{width: '100%'}}>
              Absence
            </Button>
          }
        </Form.Item>
      </Form>

      <br/>
      <Form
        form={formProject}
        name="basic"
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item name="seeProject">
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Pilih Projek Untuk Lihat"
            optionFilterProp="label"
            onChange={onChangeProjectView}
            filterSort={(optionA, optionB) => {
              var _a, _b;
              return (
                (_a = optionA === null || optionA === void 0 ? void 0 : optionA.label) !== null &&
                _a !== void 0
                  ? _a
                  : ''
              )
                .toLowerCase()
                .localeCompare(
                  ((_b = optionB === null || optionB === void 0 ? void 0 : optionB.label) !== null &&
                  _b !== void 0
                    ? _b
                    : ''
                  ).toLowerCase(),
                );
            }}
            options={projects.map(itm => ({value: itm.id, label: itm.name}))}
          />
        </Form.Item>
      </Form>
      

      <br/>
      <br/>
            
      <TableData 
          dataSource={projectMandays} 
          columns={['no', 'project', 'user', 'hari', 'gaji', 'tanggal_dibuat', 'tanggal_diupdate']}
          handleDeleteProp={handleDelete}
          isHaveDetail={true}
          loading={loading}
          showDetailProp={showDetail}
      />
      
      <Modal
          title="Detail Absensi"
          centered
          open={modal2Open}
          onOk={() => closeShowDetail()}
          onCancel={() => closeShowDetail()}
          style={{paddingTop:40, paddingBottom: 40}}
      >
        <TableData 
            dataSource={absenceDetail}
            columns={['no', 'user','project','tanggal_dibuat']}
            handleDeleteProp={handleDeleteDetail}
            loading={loading}
        />
      </Modal>
    </>
  )    
}

export default Dashboard;