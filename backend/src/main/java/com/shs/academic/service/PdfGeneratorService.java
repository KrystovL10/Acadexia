package com.shs.academic.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.DashedBorder;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.util.GpaCalculator;
import com.shs.academic.model.dto.SchoolDto;
import com.shs.academic.model.dto.TranscriptDto;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfGeneratorService {

    private final StudentRepository studentRepository;
    private final TermResultRepository termResultRepository;
    private final ScoreRepository scoreRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TranscriptService transcriptService;

    // ─── Cached fonts (initialised once, reused across all PDFs) ─────
    private PdfFont fontBold;
    private PdfFont fontRegular;
    private PdfFont fontItalic;

    @PostConstruct
    void initFonts() {
        try {
            fontBold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            fontItalic  = PdfFontFactory.createFont(StandardFonts.HELVETICA_OBLIQUE);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialise PDF fonts", e);
        }
    }

    // ─── Colours ─────────────────────────────────────────────────────
    private static final DeviceRgb GES_GREEN   = new DeviceRgb(27,  107, 58);
    private static final DeviceRgb GES_GOLD    = new DeviceRgb(252, 209, 22);
    private static final DeviceRgb DARK_HEADER = new DeviceRgb(44,  62,  80);
    private static final DeviceRgb ALT_ROW     = new DeviceRgb(245, 248, 250);
    private static final DeviceRgb LIGHT_GRAY  = new DeviceRgb(230, 234, 238);
    private static final DeviceRgb WHITE        = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb DARK_GREY    = new DeviceRgb(80, 80, 80);
    private static final DeviceRgb GRADE_GREEN  = new DeviceRgb(34, 139, 34);
    private static final DeviceRgb GRADE_BLUE   = new DeviceRgb(30, 100, 200);
    private static final DeviceRgb GRADE_AMBER  = new DeviceRgb(200, 150, 0);
    private static final DeviceRgb GRADE_ORANGE = new DeviceRgb(220, 120, 0);
    private static final DeviceRgb GRADE_RED    = new DeviceRgb(200, 30, 30);
    private static final DeviceRgb SUMMARY_GREEN = new DeviceRgb(40, 130, 80);

    // ─── Transcript GPA colour scale ─────────────────────────────────
    private static final DeviceRgb GPA_GREEN  = new DeviceRgb(22, 163, 74);
    private static final DeviceRgb GPA_TEAL   = new DeviceRgb(5, 150, 105);
    private static final DeviceRgb GPA_BLUE   = new DeviceRgb(37, 99, 235);
    private static final DeviceRgb GPA_AMBER  = new DeviceRgb(217, 119, 6);
    private static final DeviceRgb GPA_ORANGE = new DeviceRgb(234, 88, 12);
    private static final DeviceRgb GPA_RED    = new DeviceRgb(220, 38, 38);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ================================================================
    // TERMINAL REPORT — single student
    // ================================================================

    @Transactional(readOnly = true)
    public byte[] generateTerminalReportPdf(Long studentId, Long termId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));

        TermResult tr = termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Term result not found — generate reports first"));

        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, termId);
        scores.sort((a, b) -> a.getSubject().getName().compareTo(b.getSubject().getName()));

        try {
            return buildReportPdf(student, tr, scores);
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF for student "
                    + student.getStudentIndex(), e);
        }
    }

    // ================================================================
    // TRANSCRIPT — all terms
    // ================================================================

    @Transactional(readOnly = true)
    public byte[] generateTranscriptPdf(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));

        TranscriptDto transcript = transcriptService.generateTranscript(studentId);

        try {
            return buildTranscriptPdf(student, transcript);
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate transcript PDF for student "
                    + student.getStudentIndex(), e);
        }
    }

    // ================================================================
    // CLASS ZIP — all students in a class
    // ================================================================

    @Transactional(readOnly = true)
    public byte[] generateClassReportZip(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom not found: " + classRoomId));

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId)
                .stream().filter(Student::isActive).toList();

        // Resolve term metadata
        List<TermResult> allTermResults =
                termResultRepository.findByClassRoomIdAndTermId(classRoomId, termId);
        String termLabel = allTermResults.stream().findFirst()
                .map(tr -> switch (tr.getTerm().getTermType()) {
                    case TERM_1 -> "Term1";
                    case TERM_2 -> "Term2";
                    case TERM_3 -> "Term3";
                })
                .orElse("Term");
        String yearLabel = allTermResults.stream().findFirst()
                .map(tr -> tr.getTerm().getAcademicYear().getYearLabel().replace("/", "-"))
                .orElse("");

        int successCount = 0;
        int failCount = 0;
        StringBuilder summaryStudents = new StringBuilder();

        // Build sorted list for summary (by position)
        List<TermResult> sortedResults = allTermResults.stream()
                .sorted((a, b) -> {
                    Integer pa = a.getPositionInClass();
                    Integer pb = b.getPositionInClass();
                    if (pa == null && pb == null) return 0;
                    if (pa == null) return 1;
                    if (pb == null) return -1;
                    return pa.compareTo(pb);
                })
                .toList();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipArchiveOutputStream zip = new ZipArchiveOutputStream(baos)) {
            zip.setEncoding("UTF-8");
            zip.setMethod(ZipArchiveOutputStream.DEFLATED);
            zip.setLevel(java.util.zip.Deflater.BEST_SPEED);

            // Generate individual PDFs
            for (Student student : students) {
                try {
                    byte[] pdf = generateTerminalReportPdf(student.getId(), termId);
                    String fileName = student.getStudentIndex() + "_"
                            + sanitise(student.getUser().getLastName()) + "_"
                            + sanitise(student.getUser().getFirstName())
                            + "_Report_" + termLabel + "_" + yearLabel + ".pdf";
                    ZipArchiveEntry entry = new ZipArchiveEntry(fileName);
                    entry.setSize(pdf.length);
                    zip.putArchiveEntry(entry);
                    zip.write(pdf);
                    zip.closeArchiveEntry();
                    successCount++;
                } catch (Exception e) {
                    failCount++;
                    log.warn("Failed PDF for student {} — {}",
                            student.getStudentIndex(), e.getMessage());

                    // Add error file to ZIP
                    String errName = "ERROR_" + student.getStudentIndex() + ".txt";
                    byte[] errBytes = ("PDF generation failed for student: "
                            + student.getUser().getFullName()
                            + " (" + student.getStudentIndex() + ")\n"
                            + "Error: " + e.getMessage() + "\n").getBytes();
                    ZipArchiveEntry errEntry = new ZipArchiveEntry(errName);
                    errEntry.setSize(errBytes.length);
                    zip.putArchiveEntry(errEntry);
                    zip.write(errBytes);
                    zip.closeArchiveEntry();
                }
            }

            // Build summary text
            double gpaSum = 0; int gpaCount = 0;
            double highestGpa = -1; String highestName = "";
            double lowestGpa = 5; String lowestName = "";
            int passedCount = 0;

            for (TermResult tr : sortedResults) {
                String name = tr.getStudent().getUser().getFullName();
                String idx = tr.getStudent().getStudentIndex();
                double gpa = tr.getGpa() != null ? tr.getGpa() : 0;
                String pos = tr.getPositionInClass() != null
                        ? String.valueOf(tr.getPositionInClass()) : "—";
                String classif = tr.getGpa() != null
                        ? com.shs.academic.util.GpaCalculator.getClassification(tr.getGpa())
                        : "N/A";

                summaryStudents.append(String.format("  %-14s | %-30s | GPA: %.2f | Pos: %-4s | %s%n",
                        idx, name, gpa, pos, classif));

                if (tr.getGpa() != null) {
                    gpaSum += tr.getGpa(); gpaCount++;
                    if (tr.getGpa() > highestGpa) { highestGpa = tr.getGpa(); highestName = name; }
                    if (tr.getGpa() < lowestGpa) { lowestGpa = tr.getGpa(); lowestName = name; }
                    if (tr.getGpa() >= 1.6) passedCount++;
                }
            }

            double avgGpa = gpaCount > 0 ? gpaSum / gpaCount : 0;
            double passRate = gpaCount > 0 ? (passedCount * 100.0 / gpaCount) : 0;

            String summaryContent = String.format(
                    """
                    CLASS REPORT SUMMARY
                    =====================
                    Class: %s
                    Term: %s
                    Academic Year: %s
                    Generated: %s
                    Total Students: %d
                    Reports Generated: %d
                    Reports Failed: %d

                    STUDENT LIST:
                    %s
                    CLASS STATISTICS:
                    Average GPA: %.2f
                    Highest GPA: %.2f (%s)
                    Lowest GPA: %.2f (%s)
                    Pass Rate: %.1f%%
                    """,
                    classRoom.getDisplayName(),
                    termLabel.replace("Term", "Term "),
                    yearLabel.replace("-", "/"),
                    java.time.LocalDateTime.now().format(
                            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                    students.size(),
                    successCount, failCount,
                    summaryStudents,
                    avgGpa,
                    highestGpa >= 0 ? highestGpa : 0, highestName.isEmpty() ? "—" : highestName,
                    lowestGpa <= 4 ? lowestGpa : 0, lowestName.isEmpty() ? "—" : lowestName,
                    passRate);

            String summaryFileName = "_ClassSummary_"
                    + sanitise(classRoom.getDisplayName()) + "_" + termLabel + ".txt";
            byte[] summaryBytes = summaryContent.getBytes();
            ZipArchiveEntry summaryEntry = new ZipArchiveEntry(summaryFileName);
            summaryEntry.setSize(summaryBytes.length);
            zip.putArchiveEntry(summaryEntry);
            zip.write(summaryBytes);
            zip.closeArchiveEntry();

            zip.finish();
        } catch (IOException e) {
            throw new RuntimeException(
                    "Failed to build ZIP for class " + classRoom.getDisplayName(), e);
        }

        log.info("Generated ZIP for class {} — {} succeeded, {} failed",
                classRoom.getDisplayName(), successCount, failCount);
        return baos.toByteArray();
    }

    // ================================================================
    // PDF BUILDERS
    // ================================================================

    private byte[] buildReportPdf(Student student, TermResult tr, List<Score> scores)
            throws IOException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(50, 50, 50, 50);

        PdfFont bold   = fontBold;
        PdfFont body   = fontRegular;
        PdfFont italic = fontItalic;

        School school  = student.getSchool();
        String termName = switch (tr.getTerm().getTermType()) {
            case TERM_1 -> "Term 1";
            case TERM_2 -> "Term 2";
            case TERM_3 -> "Term 3";
        };
        String termN = switch (tr.getTerm().getTermType()) {
            case TERM_1 -> "TERM 1";
            case TERM_2 -> "TERM 2";
            case TERM_3 -> "TERM 3";
        };
        String yearLabel = tr.getTerm().getAcademicYear().getYearLabel();
        String classification = tr.getGpa() != null
                ? GpaCalculator.getClassification(tr.getGpa()) : "—";

        // Reduce font size for many subjects
        float tableFontSize = scores.size() > 12 ? 7f : 8f;

        // ══════════════════════════════════════════════════════════════
        // SECTION 1 — School Header (3-column)
        // ══════════════════════════════════════════════════════════════
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{20f, 60f, 20f}))
                .useAllAvailableWidth().setBorder(Border.NO_BORDER);

        // Left: crest placeholder
        Cell crestCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("CREST").setFont(bold).setFontSize(8)
                        .setFontColor(DARK_GREY).setTextAlignment(TextAlignment.CENTER))
                .setWidth(60).setHeight(60)
                .setBorder(new SolidBorder(DARK_GREY, 1f))
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.CENTER);
        headerTable.addCell(crestCell);

        // Center: school info
        Cell centerCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        centerCell.add(new Paragraph(school.getName().toUpperCase())
                .setFont(bold).setFontSize(16).setFontColor(GES_GREEN)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(1));
        centerCell.add(new Paragraph("SENIOR HIGH SCHOOL")
                .setFont(body).setFontSize(10).setFontColor(DARK_GREY)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(1));
        if (school.getMotto() != null && !school.getMotto().isBlank()) {
            centerCell.add(new Paragraph("\"" + school.getMotto() + "\"")
                    .setFont(italic).setFontSize(9).setFontColor(DARK_GREY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(1));
        }
        String address = orEmpty(school.getAddress());
        if (!address.isBlank()) {
            centerCell.add(new Paragraph(address)
                    .setFont(body).setFontSize(8).setFontColor(DARK_GREY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0));
        }
        String contactLine = List.of(orEmpty(school.getPhoneNumber()), orEmpty(school.getEmail()))
                .stream().filter(s -> !s.isBlank())
                .reduce((a, b) -> a + "  |  " + b).orElse("");
        if (!contactLine.isBlank()) {
            centerCell.add(new Paragraph(contactLine)
                    .setFont(body).setFontSize(8).setFontColor(DARK_GREY)
                    .setTextAlignment(TextAlignment.CENTER));
        }
        headerTable.addCell(centerCell);

        // Right: TERMINAL REPORT label
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        rightCell.add(new Paragraph("TERMINAL")
                .setFont(bold).setFontSize(14).setFontColor(DARK_HEADER)
                .setTextAlignment(TextAlignment.RIGHT).setMarginBottom(0));
        rightCell.add(new Paragraph("REPORT")
                .setFont(bold).setFontSize(14).setFontColor(DARK_HEADER)
                .setTextAlignment(TextAlignment.RIGHT));
        headerTable.addCell(rightCell);

        doc.add(headerTable);

        // Gold separator line
        SolidLine goldLine = new SolidLine(3f);
        goldLine.setColor(GES_GOLD);
        doc.add(new LineSeparator(goldLine).setMarginTop(6).setMarginBottom(8));

        // ══════════════════════════════════════════════════════════════
        // SECTION 2 — Report ID Bar (green)
        // ══════════════════════════════════════════════════════════════
        Table idBar = new Table(UnitValue.createPercentArray(new float[]{1f, 1f, 1f}))
                .useAllAvailableWidth();
        Cell yearCell = new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(6)
                .add(new Paragraph("ACADEMIC YEAR: " + yearLabel)
                        .setFont(body).setFontSize(8).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.LEFT));
        Cell termCell = new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(6)
                .add(new Paragraph(termN)
                        .setFont(bold).setFontSize(9).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.CENTER));
        Cell dateCell = new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(6)
                .add(new Paragraph("DATE: " + LocalDate.now().format(DATE_FMT))
                        .setFont(body).setFontSize(8).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.RIGHT));
        idBar.addCell(yearCell);
        idBar.addCell(termCell);
        idBar.addCell(dateCell);
        doc.add(idBar);

        // ══════════════════════════════════════════════════════════════
        // SECTION 3 — Student Information (4-column grid)
        // ══════════════════════════════════════════════════════════════
        doc.add(createSectionTitle("STUDENT INFORMATION", bold));

        Table info = new Table(UnitValue.createPercentArray(new float[]{15f, 35f, 15f, 35f}))
                .useAllAvailableWidth().setFontSize(8).setMarginBottom(8);

        String[][] infoRows = {
                {"NAME", student.getUser().getFullName(),
                 "INDEX NO.", student.getStudentIndex()},
                {"CLASS", tr.getClassRoom() != null ? tr.getClassRoom().getDisplayName() : "—",
                 "PROGRAMME", student.getCurrentProgram() != null
                         ? student.getCurrentProgram().getDisplayName() : "—"},
                {"YEAR GROUP", student.getCurrentYearGroup() != null
                         ? student.getCurrentYearGroup().name() : "—",
                 "GENDER", student.getGender() != null ? student.getGender() : "—"},
                {"POSITION", tr.getPositionInClass() != null && tr.getTotalStudentsInClass() != null
                         ? tr.getPositionInClass() + " / " + tr.getTotalStudentsInClass() : "—",
                 "GPA", tr.getGpa() != null
                         ? String.format("%.2f", tr.getGpa()) + " (" + classification + ")" : "—"}
        };

        for (int row = 0; row < infoRows.length; row++) {
            DeviceRgb rowBg = (row % 2 == 1) ? ALT_ROW : null;
            String[] r = infoRows[row];

            // Label 1
            Cell l1 = new Cell().add(new Paragraph(r[0]).setFont(bold).setFontSize(8)
                            .setFontColor(DARK_HEADER))
                    .setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
            if (rowBg != null) l1.setBackgroundColor(rowBg);
            info.addCell(l1);

            // Value 1 — special handling for POSITION
            Cell v1 = new Cell().setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
            v1.add(new Paragraph(r[1] == null ? "—" : r[1]).setFont(body).setFontSize(8));
            if (rowBg != null) v1.setBackgroundColor(rowBg);
            if ("POSITION".equals(r[0]) && tr.getPositionInClass() != null
                    && tr.getPositionInClass() <= 3) {
                v1.setBackgroundColor(GES_GOLD);
            }
            info.addCell(v1);

            // Label 2
            Cell l2 = new Cell().add(new Paragraph(r[2]).setFont(bold).setFontSize(8)
                            .setFontColor(DARK_HEADER))
                    .setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
            if (rowBg != null) l2.setBackgroundColor(rowBg);
            info.addCell(l2);

            // Value 2 — special handling for GPA color
            Cell v2 = new Cell().setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
            if ("GPA".equals(r[2]) && tr.getGpa() != null) {
                v2.add(new Paragraph(r[3]).setFont(bold).setFontSize(8)
                        .setFontColor(getGpaColor(tr.getGpa())));
            } else {
                v2.add(new Paragraph(r[3] == null ? "—" : r[3]).setFont(body).setFontSize(8));
            }
            if (rowBg != null && !("GPA".equals(r[2]) && tr.getGpa() != null)) {
                v2.setBackgroundColor(rowBg);
            }
            info.addCell(v2);
        }
        doc.add(info);

        // ══════════════════════════════════════════════════════════════
        // SECTION 4 — Academic Performance Table
        // ══════════════════════════════════════════════════════════════
        doc.add(createSectionTitle("ACADEMIC PERFORMANCE", bold));

        float[] cols = {28f, 13f, 13f, 13f, 10f, 23f};
        Table scoreTable = new Table(UnitValue.createPercentArray(cols))
                .useAllAvailableWidth().setFontSize(tableFontSize);

        // Header row (green)
        String[] headers = {"SUBJECT", "CLASS (30%)", "EXAM (70%)", "TOTAL", "GRADE", "REMARKS"};
        for (String h : headers) {
            scoreTable.addHeaderCell(headerCell(h, bold, GES_GREEN));
        }

        // Data rows
        boolean alt = false;
        for (Score score : scores) {
            DeviceRgb rowBg = alt ? ALT_ROW : null;
            scoreTable.addCell(dataCell(score.getSubject().getName(), body, rowBg, TextAlignment.LEFT));

            if (score.isAbsent()) {
                // ABS in red across score columns
                for (int i = 0; i < 3; i++) {
                    Cell absCell = new Cell()
                            .add(new Paragraph("ABS").setFont(bold).setFontSize(tableFontSize)
                                    .setFontColor(GRADE_RED))
                            .setPadding(3).setTextAlignment(TextAlignment.CENTER)
                            .setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
                    if (rowBg != null) absCell.setBackgroundColor(rowBg);
                    scoreTable.addCell(absCell);
                }
                // Grade = dash
                scoreTable.addCell(createGradeBadgeCell("—", bold, tableFontSize));
            } else {
                scoreTable.addCell(dataCell(fmtScore(score.getClassScore(), false), body, rowBg, TextAlignment.CENTER));
                scoreTable.addCell(dataCell(fmtScore(score.getExamScore(), false), body, rowBg, TextAlignment.CENTER));
                scoreTable.addCell(dataCell(fmtTotal(score), body, rowBg, TextAlignment.CENTER));
                scoreTable.addCell(createGradeBadgeCell(score.getGrade(), bold, tableFontSize));
            }

            scoreTable.addCell(dataCell(orDash(score.getRemarks()), italic, rowBg, TextAlignment.LEFT));
            alt = !alt;
        }

        // Summary row
        Cell gpaFooter = new Cell(1, 3)
                .add(new Paragraph("GPA: " + (tr.getGpa() != null
                        ? String.format("%.2f", tr.getGpa()) : "—")
                        + "  —  " + classification)
                        .setFont(bold).setFontSize(tableFontSize)
                        .setFontColor(WHITE))
                .setBackgroundColor(SUMMARY_GREEN)
                .setPadding(5);
        Cell passedFooter = new Cell(1, 3)
                .add(new Paragraph("Passed: " + orDash(
                        tr.getSubjectsPassed() != null
                                ? String.valueOf(tr.getSubjectsPassed()) : null)
                        + "  |  Failed: " + orDash(
                        tr.getSubjectsFailed() != null
                                ? String.valueOf(tr.getSubjectsFailed()) : null))
                        .setFont(bold).setFontSize(tableFontSize)
                        .setFontColor(WHITE).setTextAlignment(TextAlignment.RIGHT))
                .setBackgroundColor(SUMMARY_GREEN)
                .setPadding(5);
        scoreTable.addFooterCell(gpaFooter);
        scoreTable.addFooterCell(passedFooter);
        doc.add(scoreTable);

        // ══════════════════════════════════════════════════════════════
        // SECTION 5 — Attendance & Conduct (side-by-side)
        // ══════════════════════════════════════════════════════════════
        Table attCondLayout = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                .useAllAvailableWidth().setMarginTop(10).setMarginBottom(8);

        // Left: Attendance Record
        Cell attBox = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        attBox.add(new Paragraph("ATTENDANCE RECORD")
                .setFont(bold).setFontSize(8).setFontColor(GES_GREEN).setMarginBottom(4));
        attBox.add(new Paragraph("Days Present: " + orDash(tr.getTotalDaysPresent()))
                .setFont(body).setFontSize(8).setMarginBottom(2));
        attBox.add(new Paragraph("Days Absent: " + orDash(tr.getTotalDaysAbsent()))
                .setFont(body).setFontSize(8).setMarginBottom(2));
        String attRate = tr.getAttendancePercentage() != null
                ? String.format("%.1f%%", tr.getAttendancePercentage()) : "—";
        Paragraph attRatePara = new Paragraph("Attendance Rate: " + attRate)
                .setFont(bold).setFontSize(8);
        if (tr.getAttendancePercentage() != null) {
            double pct = tr.getAttendancePercentage();
            attRatePara.setFontColor(pct >= 90 ? GRADE_GREEN : pct >= 75 ? GRADE_AMBER : GRADE_RED);
        }
        attBox.add(attRatePara);
        attCondLayout.addCell(attBox);

        // Right: Conduct & Attitude
        Cell condBox = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        condBox.add(new Paragraph("CONDUCT & ATTITUDE")
                .setFont(bold).setFontSize(8).setFontColor(GES_GREEN).setMarginBottom(4));
        String conduct = orDash(tr.getConductRating());
        Paragraph conductPara = new Paragraph("Conduct: ")
                .setFont(body).setFontSize(8).setMarginBottom(2);
        if (!"—".equals(conduct)) {
            conductPara.add(new com.itextpdf.layout.element.Text(" " + conduct + " ")
                    .setFont(bold).setFontSize(8)
                    .setFontColor(WHITE)
                    .setBackgroundColor(getConductColor(conduct)));
        } else {
            conductPara.add(new com.itextpdf.layout.element.Text(conduct).setFont(body));
        }
        condBox.add(conductPara);
        condBox.add(new Paragraph("Interest: —").setFont(body).setFontSize(8).setMarginBottom(2));
        condBox.add(new Paragraph("Attitude: —").setFont(body).setFontSize(8));
        attCondLayout.addCell(condBox);

        doc.add(attCondLayout);

        // ══════════════════════════════════════════════════════════════
        // SECTION 6 — Remarks
        // ══════════════════════════════════════════════════════════════
        doc.add(createSectionTitle("REMARKS", bold));

        // Class Teacher remarks
        Table ctRemarks = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth().setMarginBottom(6);
        Cell ctBlock = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        ctBlock.add(new Paragraph("CLASS TEACHER'S REMARKS")
                .setFont(bold).setFontSize(8).setFontColor(GES_GREEN).setMarginBottom(3));
        ctBlock.add(new Paragraph(orDash(tr.getClassTeacherRemarks()))
                .setFont(italic).setFontSize(8).setMarginBottom(6));
        ctBlock.add(new Paragraph("Signature: _________________________   Date: ___________")
                .setFont(body).setFontSize(7).setFontColor(DARK_GREY));
        ctRemarks.addCell(ctBlock);
        doc.add(ctRemarks);

        // Headmaster remarks
        Table hmRemarks = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth().setMarginBottom(8);
        Cell hmBlock = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        hmBlock.add(new Paragraph("HEADMASTER'S REMARKS")
                .setFont(bold).setFontSize(8).setFontColor(GES_GREEN).setMarginBottom(3));
        hmBlock.add(new Paragraph(orDash(tr.getHeadmasterRemarks()))
                .setFont(italic).setFontSize(8).setMarginBottom(6));
        hmBlock.add(new Paragraph("Signature: _________________________   Date: ___________")
                .setFont(body).setFontSize(7).setFontColor(DARK_GREY));
        hmRemarks.addCell(hmBlock);
        doc.add(hmRemarks);

        // ══════════════════════════════════════════════════════════════
        // SECTION 7 — Grading Scale + Footer
        // ══════════════════════════════════════════════════════════════
        String[][] gradeScale = {
                {"A1", "80-100"}, {"A2", "75-79"}, {"B2", "70-74"}, {"B3", "65-69"},
                {"C4", "60-64"}, {"C5", "55-59"}, {"C6", "50-54"}, {"D7", "45-49"},
                {"E8", "40-44"}, {"F9", "0-39"}
        };
        Table scaleTable = new Table(UnitValue.createPercentArray(gradeScale.length))
                .useAllAvailableWidth().setMarginBottom(4);
        for (String[] gs : gradeScale) {
            DeviceRgb pillColor = getGradeBadgeColor(gs[0]);
            Cell pill = new Cell().setBorder(Border.NO_BORDER).setPadding(2)
                    .setTextAlignment(TextAlignment.CENTER);
            pill.add(new Paragraph(gs[0]).setFont(bold).setFontSize(7)
                    .setFontColor(WHITE).setBackgroundColor(pillColor)
                    .setTextAlignment(TextAlignment.CENTER));
            pill.add(new Paragraph(gs[1]).setFont(body).setFontSize(6)
                    .setFontColor(DARK_GREY).setTextAlignment(TextAlignment.CENTER));
            scaleTable.addCell(pill);
        }
        doc.add(scaleTable);

        // Document footer
        SolidLine footerLine = new SolidLine(0.5f);
        footerLine.setColor(LIGHT_GRAY);
        doc.add(new LineSeparator(footerLine).setMarginTop(4).setMarginBottom(4));

        Table footer = new Table(UnitValue.createPercentArray(new float[]{1f, 1f, 1f}))
                .useAllAvailableWidth().setBorder(Border.NO_BORDER);
        footer.addCell(new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("Generated by GES SHS Academic System")
                        .setFont(italic).setFontSize(6).setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.LEFT)));
        footer.addCell(new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph(school.getName())
                        .setFont(body).setFontSize(6).setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.CENTER)));
        footer.addCell(new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("Page 1 of 1")
                        .setFont(body).setFontSize(6).setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.RIGHT)));
        doc.add(footer);

        doc.close();
        return baos.toByteArray();
    }

    private byte[] buildTranscriptPdf(Student student, TranscriptDto transcript)
            throws IOException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(45, 50, 45, 50);

        PdfFont bold   = fontBold;
        PdfFont body   = fontRegular;
        PdfFont italic = fontItalic;

        SchoolDto school = transcript.getSchoolInfo();
        String schoolName = school != null ? school.getName() : "Ghana SHS";
        String studentName = transcript.getFullName();
        String studentIndex = transcript.getStudentIndex();
        String nationality = student.getNationality() != null ? student.getNationality() : "Ghanaian";
        String studentStatus = student.isHasGraduated() ? "GRADUATED"
                : student.isActive() ? "ACTIVE" : "INACTIVE";
        String verificationCode = studentIndex + "-"
                + transcript.getTotalTermsCompleted() + "-"
                + (transcript.getCgpa() != null ? String.format("%.2f", transcript.getCgpa()) : "0.00");

        // Register page event handler for header/footer on pages 2+
        pdf.addEventHandler(PdfDocumentEvent.END_PAGE,
                new TranscriptHeaderFooterHandler(schoolName, studentName, studentIndex,
                        verificationCode, bold, body, italic));

        // ══════════════════════════════════════════════════════════════
        // PAGE 1 — SCHOOL HEADER
        // ══════════════════════════════════════════════════════════════
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{20f, 80f}))
                .useAllAvailableWidth().setBorder(Border.NO_BORDER);

        // Left: crest placeholder
        Cell crestCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("CREST").setFont(bold).setFontSize(8)
                        .setFontColor(DARK_GREY).setTextAlignment(TextAlignment.CENTER))
                .setWidth(55).setHeight(55)
                .setBorder(new SolidBorder(DARK_GREY, 1f))
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.CENTER);
        headerTable.addCell(crestCell);

        // Center: school info
        Cell centerCell = new Cell().setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        centerCell.add(new Paragraph(schoolName.toUpperCase())
                .setFont(bold).setFontSize(15).setFontColor(GES_GREEN)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(1));
        if (school != null && school.getAddress() != null && !school.getAddress().isBlank()) {
            centerCell.add(new Paragraph(school.getAddress())
                    .setFont(body).setFontSize(8).setFontColor(DARK_GREY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(0));
        }
        if (school != null) {
            String contact = List.of(orEmpty(school.getPhoneNumber()), orEmpty(school.getEmail()))
                    .stream().filter(s -> !s.isBlank())
                    .reduce((a, b) -> a + "  |  " + b).orElse("");
            if (!contact.isBlank()) {
                centerCell.add(new Paragraph(contact)
                        .setFont(body).setFontSize(8).setFontColor(DARK_GREY)
                        .setTextAlignment(TextAlignment.CENTER));
            }
        }
        headerTable.addCell(centerCell);
        doc.add(headerTable);

        // Gold divider
        SolidLine goldLine = new SolidLine(3f);
        goldLine.setColor(GES_GOLD);
        doc.add(new LineSeparator(goldLine).setMarginTop(4).setMarginBottom(6));

        // ── Transcript Title Bar ──────────────────────────────────────
        Table titleBar = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth();
        titleBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(10)
                .add(new Paragraph("OFFICIAL ACADEMIC TRANSCRIPT")
                        .setFont(bold).setFontSize(14).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.CENTER)));
        doc.add(titleBar);

        // ── Student Identification Table ──────────────────────────────
        doc.add(new Paragraph().setMarginBottom(6));

        Table idTable = new Table(UnitValue.createPercentArray(new float[]{1f, 1f, 1f}))
                .useAllAvailableWidth().setFontSize(8).setMarginBottom(0);

        // Row 1
        idTable.addCell(transcriptIdCell("FULL NAME", studentName, bold, body));
        idTable.addCell(transcriptIdCell("INDEX NUMBER", studentIndex, bold, body));
        idTable.addCell(transcriptIdCell("GENDER", orDash(transcript.getGender()), bold, body));

        // Row 2
        idTable.addCell(transcriptIdCell("PROGRAMME", orDash(transcript.getProgramName()), bold, body));
        idTable.addCell(transcriptIdCell("DATE OF BIRTH",
                transcript.getDateOfBirth() != null
                        ? transcript.getDateOfBirth().format(DATE_FMT) : "—", bold, body));
        idTable.addCell(transcriptIdCell("NATIONALITY", nationality, bold, body));

        // Row 3
        String admYear = transcript.getAdmissionDate() != null
                ? String.valueOf(transcript.getAdmissionDate().getYear()) : "—";
        idTable.addCell(transcriptIdCell("YEAR OF ADMISSION", admYear, bold, body));
        idTable.addCell(transcriptIdCell("DATE ISSUED",
                LocalDate.now().format(DATE_FMT), bold, body));
        idTable.addCell(transcriptIdCell("STATUS", studentStatus, bold, body));
        doc.add(idTable);

        // Row 4 — CGPA summary bar
        String cgpaText = "CUMULATIVE GPA: "
                + (transcript.getCgpa() != null ? String.format("%.2f", transcript.getCgpa()) : "—")
                + "  |  CLASSIFICATION: " + orDash(transcript.getClassification())
                + "  |  TERMS COMPLETED: " + transcript.getTotalTermsCompleted() + " of 9";
        Table cgpaBar = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth();
        cgpaBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(6)
                .add(new Paragraph(cgpaText)
                        .setFont(bold).setFontSize(8).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.CENTER)));
        doc.add(cgpaBar);
        doc.add(new Paragraph().setMarginBottom(8));

        // ══════════════════════════════════════════════════════════════
        // ACADEMIC RECORD — grouped by academic year
        // ══════════════════════════════════════════════════════════════
        // Group terms by year label extracted from termLabel ("Term N — YYYY/YYYY")
        LinkedHashMap<String, List<TranscriptDto.TermTranscriptDto>> termsByYear =
                new LinkedHashMap<>();
        for (TranscriptDto.TermTranscriptDto term : transcript.getTerms()) {
            String yearKey = extractYearLabel(term.getTermLabel());
            termsByYear.computeIfAbsent(yearKey, k -> new ArrayList<>()).add(term);
        }

        int yearIndex = 0;
        for (Map.Entry<String, List<TranscriptDto.TermTranscriptDto>> yearEntry
                : termsByYear.entrySet()) {
            String yearLabel = yearEntry.getKey();
            List<TranscriptDto.TermTranscriptDto> yearTerms = yearEntry.getValue();

            // Year header from first term's data
            String yearGroupName = yearTerms.get(0).getYearGroup() != null
                    ? yearTerms.get(0).getYearGroup().name().replace("_", " ") : "YEAR " + (yearIndex + 1);
            String programLabel = orDash(transcript.getProgramName()).toUpperCase();
            String yearHeaderText = yearGroupName + " — " + programLabel + " — " + yearLabel;

            // Year header bar (gold)
            if (yearIndex > 0) {
                doc.add(new Paragraph().setMarginBottom(15));
            }
            Table yearBar = new Table(UnitValue.createPercentArray(new float[]{1f}))
                    .useAllAvailableWidth();
            yearBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                    .setBackgroundColor(GES_GOLD).setPadding(6)
                    .add(new Paragraph(yearHeaderText)
                            .setFont(bold).setFontSize(10).setFontColor(DARK_GREY)
                            .setTextAlignment(TextAlignment.LEFT)));
            doc.add(yearBar);

            // Each term within the year
            for (TranscriptDto.TermTranscriptDto term : yearTerms) {
                String termName = extractTermName(term.getTermLabel());

                // Term label row
                Table termBar = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                        .useAllAvailableWidth()
                        .setBorderBottom(new SolidBorder(GES_GREEN, 1f));
                termBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                        .setBackgroundColor(LIGHT_GRAY).setPadding(4)
                        .add(new Paragraph(termName.toUpperCase())
                                .setFont(bold).setFontSize(8).setFontColor(GES_GREEN)
                                .setTextAlignment(TextAlignment.LEFT)));
                String gpaStr = term.getGpa() != null
                        ? "GPA: " + String.format("%.2f", term.getGpa()) : "GPA: —";
                Paragraph gpaPara = new Paragraph(gpaStr)
                        .setFont(bold).setFontSize(8).setTextAlignment(TextAlignment.RIGHT);
                if (term.getGpa() != null) {
                    gpaPara.setFontColor(getTranscriptGpaColor(term.getGpa()));
                }
                termBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                        .setBackgroundColor(LIGHT_GRAY).setPadding(4)
                        .add(gpaPara));
                doc.add(termBar);

                if (term.getSubjects() == null || term.getSubjects().isEmpty()) {
                    // Empty term placeholder
                    Table emptyTable = new Table(UnitValue.createPercentArray(new float[]{1f}))
                            .useAllAvailableWidth().setMarginBottom(8);
                    emptyTable.addCell(new Cell()
                            .setBorder(new DashedBorder(LIGHT_GRAY, 0.5f))
                            .setPadding(10)
                            .add(new Paragraph("No results recorded for this term")
                                    .setFont(italic).setFontSize(8)
                                    .setFontColor(ColorConstants.GRAY)
                                    .setTextAlignment(TextAlignment.CENTER)));
                    doc.add(emptyTable);
                    continue;
                }

                // Subject scores table
                float[] cols = {35f, 13f, 13f, 12f, 10f, 10f, 7f};
                Table scoreTable = new Table(UnitValue.createPercentArray(cols))
                        .useAllAvailableWidth().setFontSize(8).setMarginBottom(0);

                String[] hdr = {"SUBJECT", "CLASS (30%)", "EXAM (70%)", "TOTAL (100%)",
                        "GRADE", "REMARKS", "GP"};
                for (String h : hdr) {
                    scoreTable.addHeaderCell(new Cell()
                            .add(new Paragraph(h).setFont(bold).setFontSize(7.5f)
                                    .setFontColor(WHITE))
                            .setBackgroundColor(GES_GREEN).setPadding(3)
                            .setTextAlignment(TextAlignment.CENTER)
                            .setBorder(new SolidBorder(WHITE, 0.3f)));
                }

                boolean alt = false;
                for (TranscriptDto.SubjectScoreDto s : term.getSubjects()) {
                    DeviceRgb bg = alt ? ALT_ROW : null;
                    scoreTable.addCell(dataCell(s.getSubjectName(), body, bg, TextAlignment.LEFT));

                    if (s.isAbsent()) {
                        scoreTable.addCell(absCellSmall(bold, bg));
                        scoreTable.addCell(absCellSmall(bold, bg));
                        scoreTable.addCell(absCellSmall(bold, bg));
                        scoreTable.addCell(createGradeBadgeCell("—", bold, 8f));
                        scoreTable.addCell(dataCell("Absent", italic, bg, TextAlignment.LEFT));
                        scoreTable.addCell(dataCell("—", body, bg, TextAlignment.CENTER));
                    } else {
                        scoreTable.addCell(dataCell(fmtD(s.getClassScore()), body, bg, TextAlignment.CENTER));
                        scoreTable.addCell(dataCell(fmtD(s.getExamScore()), body, bg, TextAlignment.CENTER));
                        scoreTable.addCell(dataCell(fmtD(s.getTotalScore()), body, bg, TextAlignment.CENTER));
                        scoreTable.addCell(createGradeBadgeCell(s.getGrade(), bold, 8f));
                        scoreTable.addCell(dataCell(orDash(s.getRemarks()), italic, bg, TextAlignment.LEFT));
                        scoreTable.addCell(dataCell(s.getGradePoint() != null
                                ? String.format("%.2f", s.getGradePoint()) : "—",
                                body, bg, TextAlignment.CENTER));
                    }
                    alt = !alt;
                }
                doc.add(scoreTable);

                // Term summary row
                DeviceRgb sumBg = new DeviceRgb(220, 224, 228);
                Table termSummary = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                        .useAllAvailableWidth().setMarginBottom(0);
                String conductStr = "Conduct: " + orDash(term.getConductRating());
                termSummary.addCell(new Cell().setBorder(Border.NO_BORDER)
                        .setBackgroundColor(sumBg).setPadding(4)
                        .add(new Paragraph(conductStr).setFont(body).setFontSize(7.5f)));
                String rightSummary = "TERM GPA: "
                        + (term.getGpa() != null ? String.format("%.2f", term.getGpa()) : "—");
                if (term.getPosition() != null && term.getTotalStudents() != null) {
                    rightSummary += "  |  POSITION: " + term.getPosition()
                            + " of " + term.getTotalStudents();
                }
                Paragraph rightPara = new Paragraph(rightSummary)
                        .setFont(bold).setFontSize(7.5f).setTextAlignment(TextAlignment.RIGHT);
                termSummary.addCell(new Cell().setBorder(Border.NO_BORDER)
                        .setBackgroundColor(sumBg).setPadding(4)
                        .add(rightPara));
                doc.add(termSummary);

                // Attendance + remarks row
                Table attRemarks = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                        .useAllAvailableWidth().setMarginBottom(8);
                String attText = "Attendance: ";
                if (term.getAttendancePercentage() != null) {
                    attText += String.format("%.1f%%", term.getAttendancePercentage());
                    if (term.getTotalDaysPresent() != null || term.getTotalDaysAbsent() != null) {
                        attText += " (Present: " + orDash(term.getTotalDaysPresent())
                                + " / Absent: " + orDash(term.getTotalDaysAbsent()) + ")";
                    }
                } else {
                    attText += "—";
                }
                attRemarks.addCell(new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.3f))
                        .setPadding(3)
                        .add(new Paragraph(attText).setFont(body).setFontSize(7.5f)
                                .setFontColor(ColorConstants.DARK_GRAY)));

                String remText = "Class Teacher's Remarks: ";
                if (term.getClassTeacherRemarks() != null && !term.getClassTeacherRemarks().isBlank()) {
                    String rem = term.getClassTeacherRemarks();
                    remText += rem.length() > 80 ? rem.substring(0, 77) + "..." : rem;
                } else {
                    remText += "—";
                }
                attRemarks.addCell(new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.3f))
                        .setPadding(3)
                        .add(new Paragraph(remText).setFont(italic).setFontSize(7.5f)
                                .setFontColor(ColorConstants.DARK_GRAY)));
                doc.add(attRemarks);
            }
            yearIndex++;
        }

        // ══════════════════════════════════════════════════════════════
        // CUMULATIVE SUMMARY PAGE
        // ══════════════════════════════════════════════════════════════
        doc.add(new com.itextpdf.layout.element.AreaBreak());

        // Performance Summary title
        Table summTitleBar = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth();
        summTitleBar.addCell(new Cell().setBorder(Border.NO_BORDER)
                .setBackgroundColor(GES_GREEN).setPadding(8)
                .add(new Paragraph("PERFORMANCE SUMMARY")
                        .setFont(bold).setFontSize(12).setFontColor(WHITE)
                        .setTextAlignment(TextAlignment.CENTER)));
        doc.add(summTitleBar);
        doc.add(new Paragraph().setMarginBottom(8));

        // GPA progression table
        Table progTable = new Table(UnitValue.createPercentArray(
                new float[]{30f, 18f, 12f, 18f, 22f}))
                .useAllAvailableWidth().setFontSize(8);
        String[] progHdr = {"ACADEMIC YEAR", "TERM", "GPA", "POSITION", "REMARKS"};
        for (String h : progHdr) {
            progTable.addHeaderCell(headerCell(h, bold, GES_GREEN));
        }

        // Track stats for the statistics box
        double highestGpa = -1; String highestGpaTerm = "";
        double lowestGpa = 5; String lowestGpaTerm = "";
        double prevGpa = -1; double bestImprovement = 0;
        String improvementLabel = "";
        int totalSubjectsTaken = 0, totalSubjectsPassed = 0, totalSubjectsFailed = 0;
        Map<String, List<Double>> subjectScores = new LinkedHashMap<>();

        boolean altRow = false;
        for (TranscriptDto.TermTranscriptDto term : transcript.getTerms()) {
            String yearLbl = extractYearLabel(term.getTermLabel());
            String termName = extractTermName(term.getTermLabel());
            DeviceRgb bg = altRow ? ALT_ROW : null;

            progTable.addCell(dataCell(yearLbl, body, bg, TextAlignment.LEFT));
            progTable.addCell(dataCell(termName, body, bg, TextAlignment.CENTER));

            // GPA cell — color coded
            Cell gpaCell = new Cell().setPadding(3)
                    .setBorder(new SolidBorder(LIGHT_GRAY, 0.3f))
                    .setTextAlignment(TextAlignment.CENTER);
            if (bg != null) gpaCell.setBackgroundColor(bg);
            if (term.getGpa() != null) {
                gpaCell.add(new Paragraph(String.format("%.2f", term.getGpa()))
                        .setFont(bold).setFontSize(8)
                        .setFontColor(getTranscriptGpaColor(term.getGpa())));
            } else {
                gpaCell.add(new Paragraph("—").setFont(body).setFontSize(8));
            }
            progTable.addCell(gpaCell);

            String posStr = term.getPosition() != null && term.getTotalStudents() != null
                    ? term.getPosition() + " of " + term.getTotalStudents() : "—";
            progTable.addCell(dataCell(posStr, body, bg, TextAlignment.CENTER));

            String remark = term.getGpa() != null
                    ? GpaCalculator.getClassification(term.getGpa()) : "—";
            progTable.addCell(dataCell(remark, italic, bg, TextAlignment.LEFT));
            altRow = !altRow;

            // Accumulate stats
            if (term.getGpa() != null) {
                if (term.getGpa() > highestGpa) {
                    highestGpa = term.getGpa();
                    highestGpaTerm = termName + ", " + yearLbl;
                }
                if (term.getGpa() < lowestGpa) {
                    lowestGpa = term.getGpa();
                    lowestGpaTerm = termName + ", " + yearLbl;
                }
                if (prevGpa >= 0) {
                    double diff = term.getGpa() - prevGpa;
                    if (diff > bestImprovement) {
                        bestImprovement = diff;
                        improvementLabel = String.format("+%.2f (%s)", diff, termName);
                    }
                }
                prevGpa = term.getGpa();
            }
            if (term.getSubjects() != null) {
                for (TranscriptDto.SubjectScoreDto s : term.getSubjects()) {
                    totalSubjectsTaken++;
                    if (!s.isAbsent() && s.getGradePoint() != null && s.getGradePoint() >= 1.6) {
                        totalSubjectsPassed++;
                    } else {
                        totalSubjectsFailed++;
                    }
                    if (!s.isAbsent() && s.getTotalScore() != null) {
                        subjectScores.computeIfAbsent(s.getSubjectName(), k -> new ArrayList<>())
                                .add(s.getTotalScore());
                    }
                }
            }
        }
        doc.add(progTable);
        doc.add(new Paragraph().setMarginBottom(10));

        // Find best/weakest subjects
        String bestSubject = "—"; double bestAvg = 0;
        String weakestSubject = "—"; double weakestAvg = 101;
        for (Map.Entry<String, List<Double>> entry : subjectScores.entrySet()) {
            double avg = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            if (avg > bestAvg) { bestAvg = avg; bestSubject = entry.getKey(); }
            if (avg < weakestAvg) { weakestAvg = avg; weakestSubject = entry.getKey(); }
        }

        // Core subjects status
        int coresFailed = 0;
        for (TranscriptDto.TermTranscriptDto term : transcript.getTerms()) {
            if (term.getSubjects() != null) {
                for (TranscriptDto.SubjectScoreDto s : term.getSubjects()) {
                    // Core subjects typically include English, Maths, Integrated Science, Social Studies
                    // We check if gradePoint < 1.6 for any subject (simplified — no isCore flag in DTO)
                    if (!s.isAbsent() && s.getGradePoint() != null && s.getGradePoint() < 1.6) {
                        coresFailed++;
                    }
                }
            }
        }
        double passRate = totalSubjectsTaken > 0
                ? (totalSubjectsPassed * 100.0 / totalSubjectsTaken) : 0;

        // Statistics Box — 2-column
        Table statsBox = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                .useAllAvailableWidth().setMarginBottom(12);

        // Left column
        Cell leftStats = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        leftStats.add(new Paragraph("ACADEMIC STATISTICS")
                .setFont(bold).setFontSize(9).setFontColor(GES_GREEN).setMarginBottom(6));
        leftStats.add(statsLine("Highest GPA", highestGpa >= 0
                ? String.format("%.2f (%s)", highestGpa, highestGpaTerm) : "—", bold, body));
        leftStats.add(statsLine("Lowest GPA", lowestGpa <= 4
                ? String.format("%.2f (%s)", lowestGpa, lowestGpaTerm) : "—", bold, body));
        leftStats.add(statsLine("Most Improved Term",
                bestImprovement > 0 ? improvementLabel : "—", bold, body));
        leftStats.add(statsLine("Total Subjects Taken",
                String.valueOf(totalSubjectsTaken), bold, body));
        leftStats.add(statsLine("Total Subjects Passed",
                String.valueOf(totalSubjectsPassed), bold, body));
        leftStats.add(statsLine("Total Subjects Failed",
                String.valueOf(totalSubjectsFailed), bold, body));
        statsBox.addCell(leftStats);

        // Right column
        Cell rightStats = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.5f)).setPadding(8);
        rightStats.add(new Paragraph("SUBJECT ANALYSIS")
                .setFont(bold).setFontSize(9).setFontColor(GES_GREEN).setMarginBottom(6));
        rightStats.add(statsLine("Best Subject",
                !"—".equals(bestSubject)
                        ? bestSubject + " (avg: " + String.format("%.0f", bestAvg) + "/100)" : "—",
                bold, body));
        rightStats.add(statsLine("Weakest Subject",
                !"—".equals(weakestSubject)
                        ? weakestSubject + " (avg: " + String.format("%.0f", weakestAvg) + "/100)" : "—",
                bold, body));
        rightStats.add(statsLine("Overall Pass Rate",
                String.format("%.1f%%", passRate), bold, body));
        rightStats.add(statsLine("Terms Completed",
                transcript.getTotalTermsCompleted() + " of 9", bold, body));
        statsBox.addCell(rightStats);

        doc.add(statsBox);

        // ── CGPA Display (prominent) ──────────────────────────────────
        Table cgpaDisplay = new Table(UnitValue.createPercentArray(new float[]{1f}))
                .useAllAvailableWidth().setMarginBottom(10);
        Cell cgpaCell = new Cell().setBorder(new SolidBorder(GES_GREEN, 1.5f))
                .setPadding(15).setTextAlignment(TextAlignment.CENTER);
        cgpaCell.add(new Paragraph("CUMULATIVE GRADE POINT AVERAGE")
                .setFont(bold).setFontSize(10).setFontColor(DARK_HEADER)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(6));
        cgpaCell.add(new Paragraph(transcript.getCgpa() != null
                ? String.format("%.2f", transcript.getCgpa()) : "—")
                .setFont(bold).setFontSize(36).setFontColor(GES_GREEN)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(6));

        // Classification badge
        String classif = orDash(transcript.getClassification());
        DeviceRgb badgeColor = getClassificationBadgeColor(classif);
        cgpaCell.add(new Paragraph("  " + classif.toUpperCase() + "  ")
                .setFont(bold).setFontSize(12).setFontColor(WHITE)
                .setBackgroundColor(badgeColor)
                .setTextAlignment(TextAlignment.CENTER));
        cgpaDisplay.addCell(cgpaCell);
        doc.add(cgpaDisplay);

        // ── Grading Scale ─────────────────────────────────────────────
        doc.add(new Paragraph("GRADING SCALE")
                .setFont(bold).setFontSize(9).setFontColor(GES_GREEN)
                .setMarginTop(6).setMarginBottom(4));

        String[][] gradeScale = {
                {"A1", "80-100", "4.0"}, {"A2", "75-79", "3.6"},
                {"B2", "70-74", "3.2"}, {"B3", "65-69", "2.8"},
                {"C4", "60-64", "2.4"}, {"C5", "55-59", "2.0"},
                {"C6", "50-54", "1.6"}, {"D7", "45-49", "1.2"},
                {"E8", "40-44", "0.8"}, {"F9", "0-39", "0.0"}
        };
        Table scaleTable = new Table(UnitValue.createPercentArray(gradeScale.length))
                .useAllAvailableWidth().setMarginBottom(10);
        for (String[] gs : gradeScale) {
            DeviceRgb pillColor = getGradeBadgeColor(gs[0]);
            Cell pill = new Cell().setBorder(new SolidBorder(LIGHT_GRAY, 0.3f)).setPadding(3)
                    .setTextAlignment(TextAlignment.CENTER);
            pill.add(new Paragraph(gs[0]).setFont(bold).setFontSize(8)
                    .setFontColor(WHITE).setBackgroundColor(pillColor)
                    .setTextAlignment(TextAlignment.CENTER));
            pill.add(new Paragraph(gs[1]).setFont(body).setFontSize(6.5f)
                    .setFontColor(DARK_GREY).setTextAlignment(TextAlignment.CENTER));
            pill.add(new Paragraph(gs[2]).setFont(body).setFontSize(6)
                    .setFontColor(DARK_GREY).setTextAlignment(TextAlignment.CENTER));
            scaleTable.addCell(pill);
        }
        doc.add(scaleTable);

        // ── Authentication footer ─────────────────────────────────────
        SolidLine footLine = new SolidLine(1f);
        footLine.setColor(GES_GREEN);
        doc.add(new LineSeparator(footLine).setMarginBottom(8));

        doc.add(new Paragraph("This transcript is an official academic document of " + schoolName)
                .setFont(body).setFontSize(7.5f).setFontColor(DARK_GREY)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2));
        doc.add(new Paragraph("Issued by the Ghana Education Service SHS Academic System")
                .setFont(italic).setFontSize(7).setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2));
        doc.add(new Paragraph("Verification Code: " + verificationCode)
                .setFont(bold).setFontSize(7).setFontColor(DARK_GREY)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(8));

        Table sigRow = new Table(UnitValue.createPercentArray(new float[]{1f, 1f}))
                .useAllAvailableWidth();
        sigRow.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(4)
                .add(new Paragraph("Headmaster's Signature: _________________________")
                        .setFont(body).setFontSize(8)));
        Cell stampCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4);
        stampCell.add(new Paragraph("School Stamp:").setFont(body).setFontSize(8));
        stampCell.add(new Paragraph(" ").setFont(body).setFontSize(8)
                .setBorderBottom(new SolidBorder(DARK_GREY, 0.5f))
                .setHeight(30));
        sigRow.addCell(stampCell);
        doc.add(sigRow);

        doc.close();

        // Post-process: add page numbers
        return addPageNumbers(baos.toByteArray(), body, italic);
    }

    // ================================================================
    // REPORT PDF HELPERS
    // ================================================================

    private Cell createGradeBadgeCell(String grade, PdfFont font, float fontSize) {
        if (grade == null || grade.isBlank() || "—".equals(grade)) {
            return new Cell()
                    .add(new Paragraph("—").setFont(font).setFontSize(fontSize)
                            .setTextAlignment(TextAlignment.CENTER))
                    .setPadding(3).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
        }
        DeviceRgb bg = getGradeBadgeColor(grade);
        return new Cell()
                .add(new Paragraph(grade).setFont(font).setFontSize(fontSize)
                        .setFontColor(WHITE).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(bg)
                .setPadding(3).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
    }

    private DeviceRgb getGradeBadgeColor(String grade) {
        if (grade == null) return DARK_GREY;
        return switch (grade) {
            case "A1", "A2" -> GRADE_GREEN;
            case "B2", "B3" -> GRADE_BLUE;
            case "C4", "C5", "C6" -> GRADE_AMBER;
            case "D7" -> GRADE_ORANGE;
            case "E8", "F9" -> GRADE_RED;
            default -> DARK_GREY;
        };
    }

    private Paragraph createSectionTitle(String title, PdfFont font) {
        return new Paragraph(title)
                .setFont(font).setFontSize(9).setFontColor(GES_GREEN)
                .setMarginTop(6).setMarginBottom(4);
    }

    private DeviceRgb getGpaColor(double gpa) {
        if (gpa >= 3.0) return GRADE_GREEN;
        if (gpa >= 2.0) return GRADE_BLUE;
        if (gpa >= 1.6) return GRADE_AMBER;
        return GRADE_RED;
    }

    private DeviceRgb getConductColor(String rating) {
        if (rating == null) return DARK_GREY;
        return switch (rating.toLowerCase()) {
            case "excellent", "very good" -> GRADE_GREEN;
            case "good" -> GRADE_BLUE;
            case "satisfactory", "fair" -> GRADE_AMBER;
            case "poor", "unsatisfactory" -> GRADE_RED;
            default -> DARK_GREY;
        };
    }

    // ================================================================
    // TRANSCRIPT HELPERS
    // ================================================================

    private DeviceRgb getTranscriptGpaColor(double gpa) {
        if (gpa >= 3.6) return GPA_GREEN;
        if (gpa >= 3.0) return GPA_TEAL;
        if (gpa >= 2.5) return GPA_BLUE;
        if (gpa >= 2.0) return GPA_AMBER;
        if (gpa >= 1.6) return GPA_ORANGE;
        return GPA_RED;
    }

    private DeviceRgb getClassificationBadgeColor(String classification) {
        if (classification == null) return DARK_GREY;
        return switch (classification) {
            case "Distinction" -> GES_GOLD;
            case "Very Good" -> GPA_GREEN;
            case "Good" -> GPA_TEAL;
            case "Credit" -> GPA_BLUE;
            case "Pass" -> GPA_AMBER;
            default -> GPA_RED;
        };
    }

    private Cell transcriptIdCell(String label, String value, PdfFont labelFont, PdfFont valueFont) {
        Cell cell = new Cell().setBackgroundColor(LIGHT_GRAY)
                .setBorder(new SolidBorder(WHITE, 0.5f)).setPadding(4);
        cell.add(new Paragraph(label).setFont(labelFont).setFontSize(6.5f)
                .setFontColor(DARK_GREY).setMarginBottom(0));
        cell.add(new Paragraph(value == null ? "—" : value)
                .setFont(valueFont).setFontSize(8));
        return cell;
    }

    private Cell absCellSmall(PdfFont font, DeviceRgb bg) {
        Cell cell = new Cell()
                .add(new Paragraph("ABS").setFont(font).setFontSize(8).setFontColor(GRADE_RED))
                .setPadding(3).setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
        if (bg != null) cell.setBackgroundColor(bg);
        return cell;
    }

    private Paragraph statsLine(String label, String value, PdfFont labelFont, PdfFont valueFont) {
        return new Paragraph()
                .add(new com.itextpdf.layout.element.Text(label + ": ")
                        .setFont(labelFont).setFontSize(7.5f).setFontColor(DARK_HEADER))
                .add(new com.itextpdf.layout.element.Text(value)
                        .setFont(valueFont).setFontSize(7.5f))
                .setMarginBottom(2);
    }

    private String extractYearLabel(String termLabel) {
        // "Term 1 — 2023/2024" → "2023/2024"
        int idx = termLabel.indexOf("—");
        return idx >= 0 ? termLabel.substring(idx + 1).trim() : termLabel;
    }

    private String extractTermName(String termLabel) {
        // "Term 1 — 2023/2024" → "Term 1"
        int idx = termLabel.indexOf("—");
        return idx >= 0 ? termLabel.substring(0, idx).trim() : termLabel;
    }

    private byte[] addPageNumbers(byte[] pdfBytes, PdfFont body, PdfFont italic) throws IOException {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        com.itextpdf.kernel.pdf.PdfReader reader = new com.itextpdf.kernel.pdf.PdfReader(
                new java.io.ByteArrayInputStream(pdfBytes));
        PdfDocument pdfDoc = new PdfDocument(reader, new PdfWriter(result));
        int totalPages = pdfDoc.getNumberOfPages();
        for (int i = 1; i <= totalPages; i++) {
            PdfPage page = pdfDoc.getPage(i);
            Rectangle pageSize = page.getPageSize();
            PdfCanvas canvas = new PdfCanvas(page);
            canvas.beginText()
                    .setFontAndSize(body, 6.5f)
                    .moveText(pageSize.getWidth() / 2 - 20, 25)
                    .showText("Page " + i + " of " + totalPages)
                    .endText();
        }
        pdfDoc.close();
        return result.toByteArray();
    }

    // ================================================================
    // PAGE EVENT HANDLER — Transcript pages 2+
    // ================================================================

    private static class TranscriptHeaderFooterHandler implements IEventHandler {
        private final String schoolName;
        private final String studentName;
        private final String studentIndex;
        private final String verificationCode;
        private final PdfFont bold;
        private final PdfFont body;
        private final PdfFont italic;
        private int pageCount = 0;

        TranscriptHeaderFooterHandler(String schoolName, String studentName,
                String studentIndex, String verificationCode,
                PdfFont bold, PdfFont body, PdfFont italic) {
            this.schoolName = schoolName;
            this.studentName = studentName;
            this.studentIndex = studentIndex;
            this.verificationCode = verificationCode;
            this.bold = bold;
            this.body = body;
            this.italic = italic;
        }

        @Override
        public void handleEvent(Event event) {
            pageCount++;
            if (pageCount <= 1) return; // Skip page 1

            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfPage page = docEvent.getPage();
            Rectangle pageSize = page.getPageSize();
            PdfCanvas canvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(),
                    docEvent.getDocument());

            float top = pageSize.getTop() - 25;
            float left = pageSize.getLeft() + 50;
            float right = pageSize.getRight() - 50;

            // Header: school name (left) | ACADEMIC TRANSCRIPT (center) | student info (right)
            canvas.beginText().setFontAndSize(body, 7).moveText(left, top)
                    .showText(schoolName).endText();
            float centerX = (left + right) / 2 - 40;
            canvas.beginText().setFontAndSize(bold, 7).moveText(centerX, top)
                    .showText("ACADEMIC TRANSCRIPT").endText();
            String rightText = studentName + " — " + studentIndex;
            float rightTextWidth = bold.getWidth(rightText, 7);
            canvas.beginText().setFontAndSize(body, 7)
                    .moveText(right - rightTextWidth, top)
                    .showText(rightText).endText();

            // Gold line below header
            canvas.setStrokeColor(new DeviceRgb(252, 209, 22))
                    .setLineWidth(1.5f)
                    .moveTo(left, top - 5)
                    .lineTo(right, top - 5)
                    .stroke();

            // Footer
            float bottom = pageSize.getBottom() + 20;
            canvas.beginText().setFontAndSize(italic, 6)
                    .moveText(left, bottom)
                    .showText("Issued by the Ghana Education Service SHS Academic System")
                    .endText();
            canvas.beginText().setFontAndSize(body, 6)
                    .moveText(right - 80, bottom)
                    .showText("Verification: " + verificationCode)
                    .endText();
        }
    }

    // ================================================================
    // CELL HELPERS
    // ================================================================

    private Cell headerCell(String text, PdfFont font, DeviceRgb bg) {
        return new Cell()
                .add(new Paragraph(text).setFont(font).setFontSize(8)
                        .setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(bg)
                .setPadding(4)
                .setTextAlignment(TextAlignment.CENTER)
                .setBorder(new SolidBorder(ColorConstants.WHITE, 0.5f));
    }

    private Cell dataCell(String text, PdfFont font, DeviceRgb bg,
            TextAlignment align) {
        Cell cell = new Cell()
                .add(new Paragraph(text == null ? "—" : text).setFont(font).setFontSize(8))
                .setPadding(3)
                .setTextAlignment(align)
                .setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
        if (bg != null) cell.setBackgroundColor(bg);
        return cell;
    }

    private void addInfoRow(Table table, String label, String value,
            PdfFont labelFont, PdfFont valueFont) {
        table.addCell(new Cell()
                .add(new Paragraph(label).setFont(labelFont).setFontSize(8)
                        .setFontColor(DARK_HEADER))
                .setPadding(3).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f)));
        table.addCell(new Cell()
                .add(new Paragraph(value == null ? "—" : value)
                        .setFont(valueFont).setFontSize(8))
                .setPadding(3).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f)));
    }

    private void addRemarksRow(Table table, String label, String value,
            PdfFont labelFont, PdfFont valueFont, DeviceRgb labelBg) {
        Cell lbl = new Cell()
                .add(new Paragraph(label).setFont(labelFont).setFontSize(8)
                        .setFontColor(labelBg == null ? DARK_HEADER : ColorConstants.BLACK))
                .setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
        if (labelBg != null) lbl.setBackgroundColor(labelBg);
        table.addCell(lbl);
        table.addCell(new Cell()
                .add(new Paragraph(value == null ? "—" : value)
                        .setFont(valueFont).setFontSize(8))
                .setPadding(4).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f)));
    }

    private Cell sigCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text).setFont(font).setFontSize(8))
                .setPadding(6).setBorder(new SolidBorder(LIGHT_GRAY, 0.3f));
    }

    private void addDivider(Document doc) {
        doc.add(new Paragraph(" ")
                .setMarginTop(0).setMarginBottom(0)
                .setBorderBottom(new SolidBorder(GES_GREEN, 1f)));
    }

    // ================================================================
    // FORMAT HELPERS
    // ================================================================

    private String fmtScore(Double val, boolean absent) {
        if (absent) return "ABS";
        return val != null ? String.format("%.1f", val) : "—";
    }

    private String fmtTotal(Score score) {
        if (score.isAbsent()) return "ABS";
        return score.getTotalScore() != null
                ? String.format("%.1f", score.getTotalScore()) : "—";
    }

    private String fmtD(Double val) {
        return val != null ? String.format("%.1f", val) : "—";
    }

    private String orEmpty(String s) { return s != null ? s : ""; }

    private String orDash(String s) { return (s != null && !s.isBlank()) ? s : "—"; }

    private String orDash(Integer i) { return i != null ? String.valueOf(i) : "—"; }

    private String sanitise(String name) {
        return name == null ? "Student" : name.replaceAll("[^A-Za-z0-9_\\-]", "_");
    }
}
