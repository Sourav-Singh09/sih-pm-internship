import express from "express";
import mongoose from "mongoose";
import { Application } from "../models/Application.js";
import { Student } from "../models/Student.js";
import { Internship } from "../models/Internship.js";

const router = express.Router();

/* =====================================================
   TEST
===================================================== */

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Application API is working"
    });
});

/* =====================================================
   CREATE APPLICATION
   POST /api/applications
===================================================== */

router.post("/", async (req, res) => {
    try {
        const {
            studentId,
            studentEmail,
            internshipId
        } = req.body;

        /* -----------------------------
           Validate Internship ID
        ----------------------------- */

        if (!internshipId) {
            return res.status(400).json({
                success: false,
                message: "internshipId is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(internshipId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid internshipId"
            });
        }

        /* -----------------------------
           Find Student
        ----------------------------- */

        let student = null;

        if (studentId) {
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid studentId"
                });
            }

            student = await Student.findById(studentId);
        }

        /* If studentId is not available,
           search using email */

        if (!student && studentEmail) {
            student = await Student.findOne({
                email: studentEmail.toLowerCase().trim()
            });
        }

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        /* -----------------------------
           Find Internship
        ----------------------------- */

        const internship = await Internship.findById(internshipId);

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: "Internship not found"
            });
        }

        /* -----------------------------
           Check Duplicate Application
        ----------------------------- */

        const existingApplication = await Application.findOne({
            studentId: student._id,
            internshipId: internship._id
        });

        if (existingApplication) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this internship.",
                application: existingApplication
            });
        }

        /* -----------------------------
           Create Application
        ----------------------------- */

        const application = await Application.create({
            studentId: student._id,
            internshipId: internship._id,
            studentName: student.name,
            internshipTitle: internship.title,
            company: internship.company,
            status: "Applied"
        });

        /* -----------------------------
           Return Application
        ----------------------------- */

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            application
        });

    } catch (error) {

        console.error("CREATE APPLICATION ERROR:", error);

        /* MongoDB duplicate-key protection */

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this internship."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to submit application",
            error: error.message
        });
    }
});

/* =====================================================
   GET APPLICATIONS BY STUDENT ID
   GET /api/applications/student/:studentId
===================================================== */

router.get("/student/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid studentId"
            });
        }

        const applications = await Application.find({
            studentId
        })
            .populate("internshipId")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: applications.length,
            applications
        });

    } catch (error) {

        console.error("GET STUDENT APPLICATIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch applications",
            error: error.message
        });
    }
});

/* =====================================================
   GET APPLICATIONS BY STUDENT EMAIL
   GET /api/applications/student-email/:email
===================================================== */

router.get("/student-email/:email", async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email)
            .toLowerCase()
            .trim();

        const student = await Student.findOne({ email });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student profile not found"
            });
        }

        const applications = await Application.find({
            studentId: student._id
        })
            .populate("internshipId")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: applications.length,
            applications
        });

    } catch (error) {

        console.error("GET APPLICATIONS BY EMAIL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch applications",
            error: error.message
        });
    }
});

/* =====================================================
   GET ALL APPLICATIONS
   GET /api/applications
===================================================== */

router.get("/", async (req, res) => {
    try {

        const applications = await Application.find()
            .populate("studentId")
            .populate("internshipId")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: applications.length,
            applications
        });

    } catch (error) {

        console.error("GET ALL APPLICATIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch applications",
            error: error.message
        });
    }
});

/* =====================================================
   UPDATE APPLICATION STATUS
   PUT /api/applications/:id
===================================================== */

router.put("/:id", async (req, res) => {
    try {

        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID"
            });
        }

        const allowedStatuses = [
            "Applied",
            "Under Review",
            "Shortlisted",
            "Rejected",
            "Selected"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application status"
            });
        }

        const application = await Application.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found"
            });
        }

        return res.json({
            success: true,
            message: "Application status updated",
            application
        });

    } catch (error) {

        console.error("UPDATE APPLICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update application",
            error: error.message
        });
    }
});

export default router;