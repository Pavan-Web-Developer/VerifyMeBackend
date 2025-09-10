import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// CREATE or UPDATE PROFILE (includes email & phone)
export const upsertProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, dob, headline, location, email, phone } = req.body;

        // Check if email/phone is already used by another user
        if (email || phone) {
            const conflictUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        email ? { email } : undefined,
                        phone ? { phone } : undefined,
                    ].filter(Boolean),
                    NOT: { id: userId }
                },
            });

            if (conflictUser) {
                return res.status(400).json({ message: "Email or phone already in use" });
            }
        }

        // Update User email/phone and reset verification if changed
        const userUpdateData = {};
        if (email) userUpdateData.email = email;
        if (phone) userUpdateData.phone = phone;
        if (Object.keys(userUpdateData).length) userUpdateData.isVerified = false;

        if (Object.keys(userUpdateData).length) {
            await prisma.user.update({ where: { id: userId }, data: userUpdateData });
        }

        // Upsert profile
        const profile = await prisma.profile.upsert({
            where: { userId },
            update: { firstName, lastName, dob: dob ? new Date(dob) : undefined, headline, location },
            create: {
                userId,
                firstName,
                lastName,
                dob: dob ? new Date(dob) : undefined,
                headline,
                location,
            },
        });

        res.json({ message: "Profile saved successfully", profile });
    } catch (error) {
        console.error("UPSERT PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET PROFILE
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                education: true,
                employment: true,
                certifications: true,
                verifications: true,
            },
        });

        if (!profile) return res.status(404).json({ message: "Profile not found" });

        // Include email & phone
        const user = await prisma.user.findUnique({ where: { id: userId } });

        res.json({
            ...profile,
            email: user.email,
            phone: user.phone,
            isVerified: user.isVerified,
        });
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
